import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ServerConfig } from './config.ts'

const MUTATING_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const NO_STORE_PATHS: readonly string[] = ['/api/auth/', '/api/save', '/api/admin/', '/admin']

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class RequestRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>()

  consume(key: string, limit: number, windowMs: number, now: number = Date.now()): number | undefined {
    const current = this.entries.get(key)
    const entry: RateLimitEntry =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current
    entry.count += 1
    this.entries.set(key, entry)
    this.prune(now)
    return entry.count > limit ? Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)) : undefined
  }

  reset(key: string): void {
    this.entries.delete(key)
  }

  private prune(now: number): void {
    if (this.entries.size < 2_000) return
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key)
    }
  }
}

export const sendRateLimit = async (
  reply: FastifyReply,
  retryAfterSeconds: number,
): Promise<void> => {
  reply.header('Retry-After', String(retryAfterSeconds))
  await reply.code(429).send({ code: 'too-many-requests' })
}

const normalizedOrigin = (value: string): string | undefined => {
  try {
    const url = new URL(value)
    return url.pathname === '/' && !url.search && !url.hash ? url.origin : undefined
  } catch {
    return undefined
  }
}

const requestOrigins = (request: FastifyRequest, config: ServerConfig): Set<string> => {
  const allowed = new Set(
    (config.allowedOrigins ?? []).flatMap((origin): string[] => {
      const value = normalizedOrigin(origin)
      return value ? [value] : []
    }),
  )
  const host = request.headers.host
  if (host) {
    allowed.add(`${config.secureCookie ? 'https' : request.protocol}://${host}`)
    if (!config.secureCookie) {
      allowed.add(`http://${host}`)
      allowed.add(`https://${host}`)
    }
  }
  return allowed
}

const setSecurityHeaders = (reply: FastifyReply, secure: boolean): void => {
  reply
    .header('X-Content-Type-Options', 'nosniff')
    .header('Referrer-Policy', 'no-referrer')
    .header('X-Frame-Options', 'DENY')
    .header('Cross-Origin-Opener-Policy', 'same-origin')
    .header('Cross-Origin-Resource-Policy', 'same-origin')
    .header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    .header(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.jsdelivr.net; font-src 'self' data:; connect-src 'self'",
    )
  if (secure) {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

export const registerSecurity = (server: FastifyInstance, config: ServerConfig): void => {
  server.addHook('onRequest', async (request, reply): Promise<void> => {
    setSecurityHeaders(reply, config.secureCookie)

    if (NO_STORE_PATHS.some((path): boolean => request.url === path || request.url.startsWith(path))) {
      reply.header('Cache-Control', 'no-store')
    }

    if (!MUTATING_METHODS.has(request.method)) return
    const rawOrigin = request.headers.origin
    const fetchSite = request.headers['sec-fetch-site']
    if (fetchSite === 'cross-site') {
      await reply.code(403).send({ code: 'cross-site-request-blocked' })
      return
    }
    if (!rawOrigin) return
    const origin = normalizedOrigin(rawOrigin)
    if (!origin || !requestOrigins(request, config).has(origin)) {
      await reply.code(403).send({ code: 'invalid-origin' })
    }
  })
}
