import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import type { ServerConfig } from './config.ts'
import {
  StickerBookServerDatabase,
  type CloudSaveRecord,
  type PublicUser,
  type UserRecord,
} from './database.ts'
import { hashPassword, verifyPassword } from './password.ts'
import { registerAdmin } from './admin.ts'
import { DatabaseBackupService } from './backup.ts'
import { registerOpenApi } from './openapi.ts'
import { registerLeaderboard } from './leaderboard.ts'
import { parseSaveSnapshot } from './save-validation.ts'
import { registerSecurity, RequestRateLimiter, sendRateLimit } from './security.ts'
import { createServerLogStream } from './logging.ts'

interface AuthBody {
  username?: unknown
  password?: unknown
}

interface SaveBody {
  baseVersion?: unknown
  data?: unknown
}

interface GoalClaimBody {
  requestId?: unknown
}

interface ClientErrorBody {
  detail?: unknown
  kind?: unknown
  message?: unknown
  name?: unknown
  route?: unknown
  source?: unknown
  stack?: unknown
  userAgent?: unknown
}

interface ClientEventBody {
  albumId?: unknown
  cardId?: unknown
  count?: unknown
  event?: unknown
  packId?: unknown
  route?: unknown
  value?: unknown
}

interface ClientErrorReport {
  detail?: string
  kind: 'api-error' | 'runtime-error' | 'unhandled-rejection' | 'vue-error'
  message: string
  name?: string
  route?: string
  source: string
  stack?: string
  userAgent?: string
}

interface ClientEventReport {
  albumId?: string
  cardId?: string
  count?: number
  event:
    | 'card.placed'
    | 'daily-task.reward-claimed'
    | 'duplicate-exchange.claimed'
    | 'minigame.reward-claimed'
    | 'pack.opened'
    | 'pack.purchased'
    | 'pick.claimed'
  packId?: string
  route?: string
  value?: number
}

const USERNAME_PATTERN: RegExp = /^[\p{L}\p{N}_.-]+$/u
const MAX_SAVE_BYTES: number = 2 * 1024 * 1024
const AUTH_RATE_WINDOW_MS: number = 15 * 60 * 1_000
const REGISTRATION_RATE_WINDOW_MS: number = 60 * 60 * 1_000
const GOAL_ID_PATTERN: RegExp = /^[a-z][a-z0-9-]{0,63}$/
const CLIENT_ERROR_RATE_WINDOW_MS: number = 60_000
const CLIENT_ERROR_KINDS: ReadonlySet<ClientErrorReport['kind']> = new Set([
  'api-error',
  'runtime-error',
  'unhandled-rejection',
  'vue-error',
])
const CLIENT_EVENTS: ReadonlySet<ClientEventReport['event']> = new Set([
  'card.placed',
  'daily-task.reward-claimed',
  'duplicate-exchange.claimed',
  'minigame.reward-claimed',
  'pack.opened',
  'pack.purchased',
  'pick.claimed',
])

const readClientText = (value: unknown, maximumLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized: string = value.trim()
  return normalized ? normalized.slice(0, maximumLength) : undefined
}

const parseClientError = (body: ClientErrorBody): ClientErrorReport | undefined => {
  const kind: ClientErrorReport['kind'] | undefined =
    typeof body.kind === 'string' && CLIENT_ERROR_KINDS.has(body.kind as ClientErrorReport['kind'])
      ? body.kind as ClientErrorReport['kind']
      : undefined
  const message: string | undefined = readClientText(body.message, 1_000)
  const source: string | undefined = readClientText(body.source, 128)
  if (!kind || !message || !source) return undefined

  return {
    detail: readClientText(body.detail, 512),
    kind,
    message,
    name: readClientText(body.name, 128),
    route: readClientText(body.route, 512),
    source,
    stack: readClientText(body.stack, 8_000),
    userAgent: readClientText(body.userAgent, 512),
  }
}

const readClientNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1_000_000_000
    ? value
    : undefined

const parseClientEvent = (body: ClientEventBody): ClientEventReport | undefined => {
  const event: ClientEventReport['event'] | undefined =
    typeof body.event === 'string' && CLIENT_EVENTS.has(body.event as ClientEventReport['event'])
      ? body.event as ClientEventReport['event']
      : undefined
  if (!event) return undefined
  return {
    albumId: readClientText(body.albumId, 128),
    cardId: readClientText(body.cardId, 128),
    count: readClientNumber(body.count),
    event,
    packId: readClientText(body.packId, 128),
    route: readClientText(body.route, 512),
    value: readClientNumber(body.value),
  }
}

const normalizeUsername = (username: string): string => username.normalize('NFKC').toLowerCase()

const readCredentials = (
  body: AuthBody,
  minimumPasswordLength: number = 8,
): { username: string; normalizedUsername: string; password: string } | undefined => {
  if (typeof body.username !== 'string' || typeof body.password !== 'string') return undefined
  const username: string = body.username.trim().normalize('NFKC')
  if (
    username.length < 3 ||
    username.length > 32 ||
    !USERNAME_PATTERN.test(username) ||
    body.password.length < minimumPasswordLength ||
    body.password.length > 128
  ) {
    return undefined
  }
  return { username, normalizedUsername: normalizeUsername(username), password: body.password }
}

const setSessionCookie = (
  reply: FastifyReply,
  name: string,
  token: string,
  expiresAt: number,
  secure: boolean,
): void => {
  reply.setCookie(name, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires: new Date(expiresAt),
  })
}

export const createServer = async (config: ServerConfig): Promise<FastifyInstance> => {
  const isProduction: boolean = config.isProduction ?? config.secureCookie
  const logLevel = config.logLevel ?? 'info'
  const logStream =
    config.logFile && logLevel !== 'silent'
      ? createServerLogStream(config.logFile)
      : undefined
  const server: FastifyInstance = Fastify({
    bodyLimit: MAX_SAVE_BYTES,
    logger: logLevel === 'silent'
      ? false
      : {
          level: logLevel,
          ...(logStream ? { stream: logStream } : {}),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'password',
              '*.password',
            ],
            censor: '[REDACTED]',
          },
        },
    disableRequestLogging: (request): boolean =>
      request.url === '/api/client-errors' || request.url === '/api/client-events',
    trustProxy: config.trustProxy ?? false,
  })
  const sessionCookie: string = config.secureCookie
    ? '__Host-sticker_book_session'
    : 'sticker_book_session'
  const authLimiter = new RequestRateLimiter()
  const invalidPasswordHash: string = await hashPassword(randomBytes(32).toString('base64url'))
  const storage = new StickerBookServerDatabase(config.databasePath)
  const backupService = new DatabaseBackupService(
    storage,
    config.databasePath,
    config.backup,
    server.log,
  )
  await server.register(cookie)
  registerSecurity(server, config)

  server.setErrorHandler(async (error, request, reply): Promise<void> => {
    const errorStatusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? error.statusCode
        : undefined
    const statusCode: number =
      typeof errorStatusCode === 'number' && errorStatusCode >= 400 && errorStatusCode < 600
        ? errorStatusCode
        : 500
    if (statusCode >= 500) {
      request.log.error({ err: error, event: 'server.unhandled-error' }, 'Unhandled server error')
    }
    await reply.code(statusCode).send({
      code:
        statusCode === 413
          ? 'payload-too-large'
          : statusCode >= 500
            ? 'internal-server-error'
            : 'invalid-request',
    })
  })

  server.addHook('onClose', async (): Promise<void> => {
    try {
      await backupService.stop()
    } finally {
      storage.close()
    }
  })

  const currentUser = (request: FastifyRequest): PublicUser | undefined => {
    const token: string | undefined = request.cookies[sessionCookie]
    return token ? storage.findUserBySession(token) : undefined
  }

  const applyRateLimit = async (
    key: string,
    limit: number,
    windowMs: number,
    reply: FastifyReply,
  ): Promise<boolean> => {
    if (!isProduction) return false
    const retryAfter = authLimiter.consume(key, limit, windowMs)
    if (retryAfter === undefined) return false
    await sendRateLimit(reply, retryAfter)
    return true
  }

  server.get('/api/health', async (): Promise<{ status: 'ok' }> => ({ status: 'ok' }))

  server.post<{ Body: ClientErrorBody }>('/api/client-errors', async (request, reply) => {
    if (
      await applyRateLimit(
        `client-error:${request.ip}`,
        30,
        CLIENT_ERROR_RATE_WINDOW_MS,
        reply,
      )
    ) {
      return
    }
    const report: ClientErrorReport | undefined = parseClientError(request.body ?? {})
    if (!report) return reply.code(400).send({ code: 'invalid-client-error' })
    const user: PublicUser | undefined = currentUser(request)
    request.log.error(
      { client: report, event: 'client.error', userId: user?.id },
      'Client application error',
    )
    return reply.code(204).send()
  })

  server.post<{ Body: ClientEventBody }>('/api/client-events', async (request, reply) => {
    if (
      await applyRateLimit(
        `client-event:${request.ip}`,
        120,
        CLIENT_ERROR_RATE_WINDOW_MS,
        reply,
      )
    ) {
      return
    }
    const report: ClientEventReport | undefined = parseClientEvent(request.body ?? {})
    if (!report) return reply.code(400).send({ code: 'invalid-client-event' })
    const user: PublicUser | undefined = currentUser(request)
    request.log.info(
      { client: report, event: `client.${report.event}`, userId: user?.id },
      'Player action',
    )
    return reply.code(204).send()
  })

  if (config.apiDocsEnabled ?? !isProduction) registerOpenApi(server)
  registerAdmin(server, storage, backupService, config)
  registerLeaderboard(server, storage)

  server.get('/api/auth/session', async (request, reply) => {
    const user: PublicUser | undefined = currentUser(request)
    if (!user) return reply.code(401).send({ code: 'unauthorized' })
    return { user }
  })

  server.post<{ Body: AuthBody }>('/api/auth/register', async (request, reply) => {
    const rateKey = `register:${request.ip}`
    if (await applyRateLimit(rateKey, 20, REGISTRATION_RATE_WINDOW_MS, reply)) return
    const credentials = readCredentials(request.body ?? {}, 12)
    if (!credentials) return reply.code(400).send({ code: 'invalid-credentials' })
    if (storage.findUserByNormalizedUsername(credentials.normalizedUsername)) {
      return reply.code(409).send({ code: 'username-taken' })
    }

    const passwordHash: string = await hashPassword(credentials.password)
    let user: PublicUser
    try {
      user = storage.createUser(
        credentials.username,
        credentials.normalizedUsername,
        passwordHash,
      )
    } catch {
      return reply.code(409).send({ code: 'username-taken' })
    }
    const session = storage.createSession(user.id)
    setSessionCookie(reply, sessionCookie, session.token, session.expiresAt, config.secureCookie)
    request.log.info({ event: 'auth.registered', userId: user.id }, 'Player registered')
    return reply.code(201).send({ user })
  })

  server.post<{ Body: AuthBody }>('/api/auth/login', async (request, reply) => {
    const rateKey = `login:${request.ip}`
    if (await applyRateLimit(rateKey, 100, AUTH_RATE_WINDOW_MS, reply)) return
    const credentials = readCredentials(request.body ?? {})
    if (!credentials) return reply.code(400).send({ code: 'invalid-credentials' })
    const accountRateKey = `login-account:${credentials.normalizedUsername}`
    if (await applyRateLimit(accountRateKey, 10, AUTH_RATE_WINDOW_MS, reply)) return
    const user: UserRecord | undefined = storage.findUserByNormalizedUsername(
      credentials.normalizedUsername,
    )
    const passwordMatches = await verifyPassword(
      credentials.password,
      user?.passwordHash ?? invalidPasswordHash,
    )
    if (!user || !passwordMatches) {
      request.log.warn({ event: 'auth.login-failed' }, 'Player login failed')
      return reply.code(401).send({ code: 'invalid-login' })
    }
    const session = storage.createSession(user.id)
    setSessionCookie(reply, sessionCookie, session.token, session.expiresAt, config.secureCookie)
    authLimiter.reset(rateKey)
    authLimiter.reset(accountRateKey)
    request.log.info({ event: 'auth.logged-in', userId: user.id }, 'Player logged in')
    return { user: { id: user.id, username: user.username } }
  })

  server.post('/api/auth/logout', async (request, reply) => {
    const user: PublicUser | undefined = currentUser(request)
    const token: string | undefined = request.cookies[sessionCookie]
    if (token) storage.deleteSession(token)
    reply.clearCookie(sessionCookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secureCookie,
    })
    request.log.info({ event: 'auth.logged-out', userId: user?.id }, 'Player logged out')
    return reply.code(204).send()
  })

  server.get('/api/save', async (request, reply) => {
    const user: PublicUser | undefined = currentUser(request)
    if (!user) return reply.code(401).send({ code: 'unauthorized' })
    return { save: storage.getCloudSave(user.id) ?? null }
  })

  server.post<{ Params: { goalId: string }; Body: GoalClaimBody }>(
    '/api/goals/:goalId/claim',
    async (request, reply) => {
      const user: PublicUser | undefined = currentUser(request)
      if (!user) return reply.code(401).send({ code: 'unauthorized' })
      if (
        !GOAL_ID_PATTERN.test(request.params.goalId) ||
        typeof request.body?.requestId !== 'string' ||
        request.body.requestId.length < 8 ||
        request.body.requestId.length > 128
      ) {
        return reply.code(400).send({ code: 'invalid-goal-claim' })
      }
      const claim = storage.claimGoalReward(
        user.id,
        request.params.goalId,
        request.body.requestId,
      )
      request.log.info(
        {
          event: 'goal.claimed',
          goalId: request.params.goalId,
          status: claim?.status ?? 'not-completed',
          userId: user.id,
        },
        'Goal reward claim processed',
      )
      return claim ?? reply.code(409).send({ code: 'goal-not-completed' })
    },
  )

  server.put<{ Body: SaveBody }>('/api/save', async (request, reply) => {
    const user: PublicUser | undefined = currentUser(request)
    if (!user) return reply.code(401).send({ code: 'unauthorized' })
    const { baseVersion, data } = request.body ?? {}
    const snapshot = parseSaveSnapshot(data)
    if (!Number.isInteger(baseVersion) || Number(baseVersion) < 0 || !snapshot) {
      return reply.code(400).send({ code: 'invalid-save' })
    }
    const save: CloudSaveRecord | undefined = storage.putCloudSave(
      user.id,
      Number(baseVersion),
      snapshot,
    )
    if (!save) {
      request.log.warn(
        { baseVersion: Number(baseVersion), event: 'save.conflict', userId: user.id },
        'Cloud save version conflict',
      )
      return reply.code(409).send({ code: 'save-conflict', save: storage.getCloudSave(user.id) })
    }
    request.log.info(
      { event: 'save.persisted', userId: user.id, version: save.version },
      'Cloud save persisted',
    )
    return { save }
  })

  storage.deleteExpiredSessions()
  await backupService.start().catch((error: unknown): void => {
    server.log.error({ err: error, event: 'backup.startup-failed' }, 'Initial database backup failed')
  })

  if (existsSync(config.distPath)) {
    await server.register(fastifyStatic, { root: config.distPath })
    server.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/') || request.url === '/admin' || request.url.startsWith('/admin/')) {
        return reply.code(404).send({ code: 'not-found' })
      }
      return reply.sendFile('index.html')
    })
  }

  return server
}
