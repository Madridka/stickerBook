import {
  existsSync,
  mkdirSync,
  lstatSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { backup } from 'node:sqlite'
import type { FastifyBaseLogger } from 'fastify'
import type { DatabaseBackupConfig } from './config.ts'
import type { StickerBookServerDatabase } from './database.ts'

export interface DatabaseBackupRecord {
  createdAt: number
  fileName: string
  reason: 'manual' | 'scheduled' | 'startup'
  sizeBytes: number
}

const BACKUP_FILE_PATTERN = /^sticker-book-(manual|scheduled|startup)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.sqlite$/

const toBackupFileName = (now: number, reason: DatabaseBackupRecord['reason']): string =>
  `sticker-book-${reason}-${new Date(now).toISOString().replaceAll(':', '-')}.sqlite`

export class DatabaseBackupService {
  private activeBackup: Promise<DatabaseBackupRecord> | undefined
  private readonly config: DatabaseBackupConfig
  private readonly databasePath: string
  private interval: ReturnType<typeof setInterval> | undefined
  private readonly logger: FastifyBaseLogger
  private readonly storage: StickerBookServerDatabase

  constructor(
    storage: StickerBookServerDatabase,
    databasePath: string,
    config: DatabaseBackupConfig,
    logger: FastifyBaseLogger,
  ) {
    this.storage = storage
    this.databasePath = databasePath
    this.config = config
    this.logger = logger
  }

  isEnabled = (): boolean => this.config.enabled && this.databasePath !== ':memory:'

  list = (): DatabaseBackupRecord[] => {
    if (!this.isEnabled()) return []
    mkdirSync(this.config.directory, { recursive: true })
    return readdirSync(this.config.directory)
      .filter((fileName): boolean => BACKUP_FILE_PATTERN.test(fileName))
      .flatMap((fileName): DatabaseBackupRecord[] => {
        const path: string = join(this.config.directory, fileName)
        const match: RegExpMatchArray | null = fileName.match(BACKUP_FILE_PATTERN)
        const stats = lstatSync(path)
        if (!match || !stats.isFile() || stats.isSymbolicLink()) return []
        return [{
          createdAt: stats.mtimeMs,
          fileName,
          reason: match[1] as DatabaseBackupRecord['reason'],
          sizeBytes: stats.size,
        }]
      })
      .sort((left, right): number => right.createdAt - left.createdAt)
  }

  create = async (
    reason: DatabaseBackupRecord['reason'] = 'manual',
  ): Promise<DatabaseBackupRecord> => {
    if (!this.isEnabled()) throw new Error('Database backups are disabled')
    if (this.activeBackup) return this.activeBackup
    this.activeBackup = this.createBackup(reason).finally((): void => {
      this.activeBackup = undefined
    })
    return this.activeBackup
  }

  start = async (): Promise<void> => {
    if (!this.isEnabled()) return
    this.interval = setInterval((): void => {
      void this.create('scheduled').catch((error: unknown): void => {
        this.logger.error({ error }, 'Scheduled database backup failed')
      })
    }, this.config.intervalMs)
    this.interval.unref()
    await this.create('startup')
  }

  stop = async (): Promise<void> => {
    if (this.interval) clearInterval(this.interval)
    this.interval = undefined
    if (this.activeBackup) await this.activeBackup
  }

  private readonly createBackup = async (
    reason: DatabaseBackupRecord['reason'],
  ): Promise<DatabaseBackupRecord> => {
    mkdirSync(this.config.directory, { recursive: true })
    const now: number = Date.now()
    const fileName: string = toBackupFileName(now, reason)
    const targetPath: string = join(this.config.directory, fileName)
    const temporaryPath: string = `${targetPath}.tmp`
    try {
      await backup(this.storage.database, temporaryPath)
      renameSync(temporaryPath, targetPath)
    } catch (error: unknown) {
      if (existsSync(temporaryPath)) {
        const temporaryStats = lstatSync(temporaryPath)
        if (temporaryStats.isFile() && !temporaryStats.isSymbolicLink()) unlinkSync(temporaryPath)
      }
      throw error
    }
    const stats = statSync(targetPath)
    const record: DatabaseBackupRecord = {
      createdAt: stats.mtimeMs,
      fileName: basename(targetPath),
      reason,
      sizeBytes: stats.size,
    }
    this.prune()
    this.logger.info({ backup: record }, 'Database backup created')
    return record
  }

  // Удаляет только распознанные backup-файлы сверх настроенного количества.
  private readonly prune = (): void => {
    const expired: DatabaseBackupRecord[] = this.list().slice(this.config.retentionCount)
    for (const record of expired) {
      const path: string = join(this.config.directory, record.fileName)
      const stats = lstatSync(path)
      if (
        BACKUP_FILE_PATTERN.test(record.fileName) &&
        stats.isFile() &&
        !stats.isSymbolicLink()
      ) {
        unlinkSync(path)
      }
    }
  }
}
