import { existsSync } from 'node:fs'
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

interface AuthBody {
  username?: unknown
  password?: unknown
  inviteCode?: unknown
}

interface SaveBody {
  baseVersion?: unknown
  data?: unknown
}

const SESSION_COOKIE: string = 'sticker_book_session'
const USERNAME_PATTERN: RegExp = /^[\p{L}\p{N}_.-]+$/u
const MAX_SAVE_BYTES: number = 10 * 1024 * 1024

const normalizeUsername = (username: string): string => username.normalize('NFKC').toLowerCase()

const readCredentials = (
  body: AuthBody,
): { username: string; normalizedUsername: string; password: string } | undefined => {
  if (typeof body.username !== 'string' || typeof body.password !== 'string') return undefined
  const username: string = body.username.trim().normalize('NFKC')
  if (
    username.length < 3 ||
    username.length > 32 ||
    !USERNAME_PATTERN.test(username) ||
    body.password.length < 8 ||
    body.password.length > 128
  ) {
    return undefined
  }
  return { username, normalizedUsername: normalizeUsername(username), password: body.password }
}

const setSessionCookie = (
  reply: FastifyReply,
  token: string,
  expiresAt: number,
  secure: boolean,
): void => {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires: new Date(expiresAt),
  })
}

export const createServer = async (config: ServerConfig): Promise<FastifyInstance> => {
  const server: FastifyInstance = Fastify({ logger: true, bodyLimit: MAX_SAVE_BYTES })
  const storage = new StickerBookServerDatabase(config.databasePath)
  await server.register(cookie)

  server.addHook('onClose', async (): Promise<void> => storage.close())

  const currentUser = (request: FastifyRequest): PublicUser | undefined => {
    const token: string | undefined = request.cookies[SESSION_COOKIE]
    return token ? storage.findUserBySession(token) : undefined
  }

  server.get('/api/health', async (): Promise<{ status: 'ok' }> => ({ status: 'ok' }))

  server.get('/api/auth/session', async (request, reply) => {
    const user: PublicUser | undefined = currentUser(request)
    if (!user) return reply.code(401).send({ code: 'unauthorized' })
    return { user }
  })

  server.post<{ Body: AuthBody }>('/api/auth/register', async (request, reply) => {
    const credentials = readCredentials(request.body ?? {})
    if (!credentials) return reply.code(400).send({ code: 'invalid-credentials' })
    if (
      config.inviteCode &&
      (typeof request.body.inviteCode !== 'string' || request.body.inviteCode !== config.inviteCode)
    ) {
      return reply.code(403).send({ code: 'invalid-invite-code' })
    }
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
    setSessionCookie(reply, session.token, session.expiresAt, config.secureCookie)
    return reply.code(201).send({ user })
  })

  server.post<{ Body: AuthBody }>('/api/auth/login', async (request, reply) => {
    const credentials = readCredentials(request.body ?? {})
    if (!credentials) return reply.code(400).send({ code: 'invalid-credentials' })
    const user: UserRecord | undefined = storage.findUserByNormalizedUsername(
      credentials.normalizedUsername,
    )
    if (!user || !(await verifyPassword(credentials.password, user.passwordHash))) {
      return reply.code(401).send({ code: 'invalid-login' })
    }
    const session = storage.createSession(user.id)
    setSessionCookie(reply, session.token, session.expiresAt, config.secureCookie)
    return { user: { id: user.id, username: user.username } }
  })

  server.post('/api/auth/logout', async (request, reply) => {
    const token: string | undefined = request.cookies[SESSION_COOKIE]
    if (token) storage.deleteSession(token)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
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
    if (!Number.isInteger(baseVersion) || Number(baseVersion) < 0 || data === undefined) {
      return reply.code(400).send({ code: 'invalid-save' })
    }
    const save: CloudSaveRecord | undefined = storage.putCloudSave(
      user.id,
      Number(baseVersion),
      data,
    )
    if (!save) {
      return reply.code(409).send({ code: 'save-conflict', save: storage.getCloudSave(user.id) })
    }
    return { save }
  })

  storage.deleteExpiredSessions()

  if (existsSync(config.distPath)) {
    await server.register(fastifyStatic, { root: config.distPath })
    server.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) return reply.code(404).send({ code: 'not-found' })
      return reply.sendFile('index.html')
    })
  }

  return server
}
