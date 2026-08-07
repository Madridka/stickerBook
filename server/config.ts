import { resolve } from 'node:path'

export interface ServerConfig {
  databasePath: string
  distPath: string
  host: string
  port: number
  secureCookie: boolean
}

const parsePort = (value: string | undefined): number => {
  const port: number = Number(value ?? 4041)
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 4041
}

export const loadServerConfig = (): ServerConfig => ({
  databasePath: resolve(process.env.STICKER_BOOK_DATABASE_PATH ?? 'server/data/sticker-book.sqlite'),
  distPath: resolve('dist'),
  host: process.env.STICKER_BOOK_HOST ?? '0.0.0.0',
  port: parsePort(process.env.STICKER_BOOK_PORT),
  secureCookie: process.env.NODE_ENV === 'production',
})
