import { dirname, resolve } from 'node:path'

export interface DatabaseBackupConfig {
  directory: string
  secondaryDirectory?: string
  enabled: boolean
  intervalMs: number
  retentionCount: number
}

export interface ServerConfig {
  adminPasswordHash?: string
  adminUsername: string
  allowedOrigins?: readonly string[]
  apiDocsEnabled?: boolean
  backup: DatabaseBackupConfig
  databasePath: string
  distPath: string
  host: string
  isProduction?: boolean
  logLevel?: 'silent' | 'info' | 'warn' | 'error'
  port: number
  secureCookie: boolean
  trustProxy?: boolean | string
}

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed: number = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback
  return !['0', 'false', 'off', 'no'].includes(value.trim().toLowerCase())
}

const parsePort = (value: string | undefined): number => {
  const port: number = Number(value ?? 4041)
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 4041
}

const parseTrustProxy = (value: string | undefined): boolean | string => {
  const normalized: string = value?.trim().toLowerCase() ?? ''
  if (!normalized || normalized === 'false') return false
  if (normalized === 'true') return true
  return value!.trim()
}

export const loadServerConfig = (): ServerConfig => {
  if (process.env.STICKER_BOOK_ADMIN_PASSWORD) {
    throw new Error(
      'STICKER_BOOK_ADMIN_PASSWORD is forbidden; use STICKER_BOOK_ADMIN_PASSWORD_HASH',
    )
  }

  const isProduction: boolean = process.env.NODE_ENV !== 'development'
  const adminPasswordHash: string | undefined =
    process.env.STICKER_BOOK_ADMIN_PASSWORD_HASH?.trim() || undefined
  if (
    adminPasswordHash &&
    !/^scrypt\$131072\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/.test(adminPasswordHash)
  ) {
    throw new Error('STICKER_BOOK_ADMIN_PASSWORD_HASH is not a supported scrypt hash')
  }
  const databasePath: string = resolve(
    process.env.STICKER_BOOK_DATABASE_PATH ?? 'server/data/sticker-book.sqlite',
  )
  const configuredLogLevel = process.env.STICKER_BOOK_LOG_LEVEL?.trim().toLowerCase()
  const logLevel: ServerConfig['logLevel'] = isProduction
    ? configuredLogLevel === 'silent' || configuredLogLevel === 'error'
      ? configuredLogLevel
      : 'warn'
    : configuredLogLevel === 'silent' ||
        configuredLogLevel === 'warn' ||
        configuredLogLevel === 'error'
      ? configuredLogLevel
      : 'info'
  const allowedOrigins: string[] = (process.env.STICKER_BOOK_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin): string => origin.trim())
    .filter(Boolean)

  return {
    adminPasswordHash,
    adminUsername: process.env.STICKER_BOOK_ADMIN_USERNAME?.trim() || 'admin',
    allowedOrigins,
    apiDocsEnabled: parseBoolean(process.env.STICKER_BOOK_API_DOCS_ENABLED, !isProduction),
    backup: {
      directory: resolve(
        process.env.STICKER_BOOK_BACKUP_DIRECTORY ?? `${dirname(databasePath)}/backups`,
      ),
      secondaryDirectory: process.env.STICKER_BOOK_BACKUP_SECONDARY_DIRECTORY?.trim()
        ? resolve(process.env.STICKER_BOOK_BACKUP_SECONDARY_DIRECTORY.trim())
        : undefined,
      enabled: parseBoolean(process.env.STICKER_BOOK_BACKUP_ENABLED, true),
      intervalMs:
        parsePositiveInteger(process.env.STICKER_BOOK_BACKUP_INTERVAL_HOURS, 1) * 60 * 60 * 1_000,
      retentionCount: parsePositiveInteger(process.env.STICKER_BOOK_BACKUP_RETENTION, 14),
    },
    databasePath,
    distPath: resolve('dist'),
    host: process.env.STICKER_BOOK_HOST ?? '0.0.0.0',
    isProduction,
    logLevel,
    port: parsePort(process.env.STICKER_BOOK_PORT),
    secureCookie: isProduction,
    trustProxy: parseTrustProxy(process.env.STICKER_BOOK_TRUST_PROXY),
  }
}
