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

interface AuthBody {
  username?: unknown
  password?: unknown
}

interface SaveBody {
  baseVersion?: unknown
  data?: unknown
}

const USERNAME_PATTERN: RegExp = /^[\p{L}\p{N}_.-]+$/u
const MAX_SAVE_BYTES: number = 2 * 1024 * 1024
const AUTH_RATE_WINDOW_MS: number = 15 * 60 * 1_000
const REGISTRATION_RATE_WINDOW_MS: number = 60 * 60 * 1_000

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
  const logLevel = config.logLevel ?? (isProduction ? 'warn' : 'info')
  const server: FastifyInstance = Fastify({
    bodyLimit: MAX_SAVE_BYTES,
    logger: logLevel === 'silent' ? false : { level: logLevel },
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

  server.setErrorHandler(async (error, _request, reply): Promise<void> => {
    const statusCode: number =
      typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500
    if (statusCode >= 500) server.log.error({ error }, 'Unhandled server error')
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
      return reply.code(401).send({ code: 'invalid-login' })
    }
    const session = storage.createSession(user.id)
    setSessionCookie(reply, sessionCookie, session.token, session.expiresAt, config.secureCookie)
    authLimiter.reset(rateKey)
    authLimiter.reset(accountRateKey)
    return { user: { id: user.id, username: user.username } }
  })

  server.post('/api/auth/logout', async (request, reply) => {
    const token: string | undefined = request.cookies[sessionCookie]
    if (token) storage.deleteSession(token)
    reply.clearCookie(sessionCookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secureCookie,
    })
    return reply.code(204).send()
  })

  server.get('/api/save', async (request, reply) => {
    const user: PublicUser | undefined = currentUser(request)
    if (!user) return reply.code(401).send({ code: 'unauthorized' })
    return { save: storage.getCloudSave(user.id) ?? null }
  })

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
      return reply.code(409).send({ code: 'save-conflict', save: storage.getCloudSave(user.id) })
    }
    return { save }
  })

  storage.deleteExpiredSessions()
  await backupService.start().catch((error: unknown): void => {
    server.log.error({ error }, 'Initial database backup failed')
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
