import { dirname, resolve } from 'node:path'

export interface DatabaseBackupConfig {
  directory: string
  enabled: boolean
  intervalMs: number
  retentionCount: number
}

export interface ServerConfig {
  adminPassword?: string
  adminUsername: string
  backup: DatabaseBackupConfig
  databasePath: string
  distPath: string
  host: string
  port: number
  secureCookie: boolean
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

export const loadServerConfig = (): ServerConfig => {
  const databasePath: string = resolve(
    process.env.STICKER_BOOK_DATABASE_PATH ?? 'server/data/sticker-book.sqlite',
  )
  return {
    adminPassword: process.env.STICKER_BOOK_ADMIN_PASSWORD,
    adminUsername: process.env.STICKER_BOOK_ADMIN_USERNAME?.trim() || 'admin',
    backup: {
      directory: resolve(
        process.env.STICKER_BOOK_BACKUP_DIRECTORY ?? `${dirname(databasePath)}/backups`,
      ),
      enabled: parseBoolean(process.env.STICKER_BOOK_BACKUP_ENABLED, true),
      intervalMs:
        parsePositiveInteger(process.env.STICKER_BOOK_BACKUP_INTERVAL_HOURS, 24) * 60 * 60 * 1_000,
      retentionCount: parsePositiveInteger(process.env.STICKER_BOOK_BACKUP_RETENTION, 14),
    },
    databasePath,
    distPath: resolve('dist'),
    // The IPv6 wildcard is dual-stack in Node and remains reachable over IPv4.
    // It also provides an IPv6 loopback path when a VPN intercepts 127.0.0.1.
    host: process.env.STICKER_BOOK_HOST ?? '::',
    port: parsePort(process.env.STICKER_BOOK_PORT),
    secureCookie: process.env.NODE_ENV === 'production',
  }
}
