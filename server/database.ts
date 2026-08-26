import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DatabaseSync, type StatementSync } from 'node:sqlite'

export interface UserRecord {
  id: string
  username: string
  passwordHash: string
  createdAt: number
}

export interface PublicUser {
  id: string
  username: string
}

export interface CloudSaveRecord {
  version: number
  updatedAt: number
  data: unknown
}

export interface GoalClaimRecord {
  status: 'claimed' | 'already-claimed'
  goalId: string
  completedAt: number
  claimedAt: number
}

interface StoredGoalClaim extends Omit<GoalClaimRecord, 'status'> {
  requestId: string | null
}

interface CloudGoalState {
  completedAt?: number
  claimedAt?: number
}

export interface AdminUserRecord extends PublicUser {
  createdAt: number
  save: CloudSaveRecord | null
}

interface RawUserRecord {
  id: string
  username: string
  password_hash: string
  created_at: number
}

interface RawSaveRecord {
  version: number
  updated_at: number
  data_json: string
}

interface RawAdminUserRecord {
  id: string
  username: string
  created_at: number
  version: number | null
  updated_at: number | null
  data_json: string | null
}

const SESSION_LIFETIME_MS: number = 30 * 24 * 60 * 60 * 1_000

const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('base64url')

const toUserRecord = (record: RawUserRecord): UserRecord => ({
  id: record.id,
  username: record.username,
  passwordHash: record.password_hash,
  createdAt: record.created_at,
})

const toAdminUserRecord = (record: RawAdminUserRecord): AdminUserRecord => ({
  id: record.id,
  username: record.username,
  createdAt: record.created_at,
  save:
    record.version === null || record.updated_at === null || record.data_json === null
      ? null
      : {
          version: record.version,
          updatedAt: record.updated_at,
          data: JSON.parse(record.data_json) as unknown,
        },
})

export class StickerBookServerDatabase {
  readonly database: DatabaseSync

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec(
      'PRAGMA foreign_keys = ON; PRAGMA trusted_schema = OFF; PRAGMA secure_delete = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;',
    )
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        username_normalized TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user_id_index ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS sessions_expires_at_index ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS cloud_saves (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        data_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS goal_claims (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_id TEXT NOT NULL,
        completed_at INTEGER NOT NULL,
        claimed_at INTEGER NOT NULL,
        request_id TEXT,
        PRIMARY KEY (user_id, goal_id)
      );
      CREATE INDEX IF NOT EXISTS goal_claims_user_id_index ON goal_claims(user_id);
    `)
  }

  createUser(username: string, normalizedUsername: string, passwordHash: string): PublicUser {
    const user: PublicUser = { id: randomUUID(), username }
    this.database
      .prepare(
        `INSERT INTO users (id, username, username_normalized, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(user.id, username, normalizedUsername, passwordHash, Date.now())
    return user
  }

  findUserByNormalizedUsername(normalizedUsername: string): UserRecord | undefined {
    const record = this.database
      .prepare(
        `SELECT id, username, password_hash, created_at
         FROM users WHERE username_normalized = ?`,
      )
      .get(normalizedUsername) as RawUserRecord | undefined
    return record ? toUserRecord(record) : undefined
  }

  createSession(userId: string): { token: string; expiresAt: number } {
    const token: string = randomBytes(32).toString('base64url')
    const now: number = Date.now()
    const expiresAt: number = now + SESSION_LIFETIME_MS
    this.database
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(hashSessionToken(token), userId, now, expiresAt)
    return { token, expiresAt }
  }

  findUserBySession(token: string): PublicUser | undefined {
    const now: number = Date.now()
    const record = this.database
      .prepare(
        `SELECT users.id, users.username
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
      )
      .get(hashSessionToken(token), now) as PublicUser | undefined
    return record
  }

  deleteSession(token: string): void {
    this.database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token))
  }

  deleteExpiredSessions(): void {
    this.database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
  }

  getCloudSave(userId: string): CloudSaveRecord | undefined {
    const record = this.database
      .prepare('SELECT version, updated_at, data_json FROM cloud_saves WHERE user_id = ?')
      .get(userId) as RawSaveRecord | undefined
    if (!record) return undefined
    return {
      version: record.version,
      updatedAt: record.updated_at,
      data: JSON.parse(record.data_json) as unknown,
    }
  }

  claimGoalReward(
    userId: string,
    goalId: string,
    requestId: string,
  ): GoalClaimRecord | undefined {
    const existing = this.database
      .prepare(
        `SELECT goal_id AS goalId, completed_at AS completedAt, claimed_at AS claimedAt,
                request_id AS requestId
         FROM goal_claims WHERE user_id = ? AND goal_id = ?`,
      )
      .get(userId, goalId) as StoredGoalClaim | undefined
    if (existing) {
      const { requestId: storedRequestId, ...claim } = existing
      return {
        status: storedRequestId === requestId ? 'claimed' : 'already-claimed',
        ...claim,
      }
    }

    const cloudState = this.findGoalStateInCloudSave(userId, goalId)
    if (!cloudState?.completedAt) return undefined
    const completedAt: number = cloudState.completedAt
    const legacyClaimedAt: number | undefined = cloudState.claimedAt
    const claimedAt: number = legacyClaimedAt ?? Date.now()
    const result = this.database
      .prepare(
        `INSERT INTO goal_claims (user_id, goal_id, completed_at, claimed_at, request_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, goal_id) DO NOTHING`,
      )
      .run(userId, goalId, completedAt, claimedAt, legacyClaimedAt === undefined ? requestId : null)

    if (result.changes === 1) {
      return {
        status: legacyClaimedAt === undefined ? 'claimed' : 'already-claimed',
        goalId,
        completedAt,
        claimedAt,
      }
    }

    const concurrent = this.database
      .prepare(
        `SELECT goal_id AS goalId, completed_at AS completedAt, claimed_at AS claimedAt,
                request_id AS requestId
         FROM goal_claims WHERE user_id = ? AND goal_id = ?`,
      )
      .get(userId, goalId) as unknown as StoredGoalClaim
    const { requestId: storedRequestId, ...claim } = concurrent
    return {
      status: storedRequestId === requestId ? 'claimed' : 'already-claimed',
      ...claim,
    }
  }

  private findGoalStateInCloudSave(userId: string, goalId: string): CloudGoalState | undefined {
    const save = this.getCloudSave(userId)
    if (!save || !save.data || typeof save.data !== 'object') return undefined
    const tables = (save.data as { tables?: unknown }).tables
    if (!Array.isArray(tables)) return undefined
    const goalStates = tables.find(
      (table): boolean =>
        Boolean(table) &&
        typeof table === 'object' &&
        (table as { name?: unknown }).name === 'goalStates',
    ) as { rows?: unknown } | undefined
    if (!Array.isArray(goalStates?.rows)) return undefined
    const state = goalStates.rows.find(
      (row): boolean =>
        Boolean(row) &&
        typeof row === 'object' &&
        (row as { goalId?: unknown }).goalId === goalId,
    ) as { completedAt?: unknown; claimedAt?: unknown } | undefined
    if (!state) return undefined
    const completedAt =
      typeof state.completedAt === 'number' &&
      Number.isFinite(state.completedAt) &&
      state.completedAt > 0
        ? state.completedAt
        : undefined
    const claimedAt =
      typeof state.claimedAt === 'number' &&
      Number.isFinite(state.claimedAt) &&
      state.claimedAt > 0
        ? state.claimedAt
        : undefined
    return { completedAt, claimedAt }
  }

  listUsers(search: string, limit: number, offset: number): {
    users: AdminUserRecord[]
    total: number
  } {
    const normalizedSearch: string = `%${search.toLocaleLowerCase()}%`
    const filter: string = search ? 'WHERE username_normalized LIKE ?' : ''
    const parameters: Array<string | number> = search ? [normalizedSearch] : []
    const countRecord = this.database
      .prepare(`SELECT COUNT(*) AS total FROM users ${filter}`)
      .get(...parameters) as { total: number }
    const records = this.database
      .prepare(
        `SELECT users.id, users.username, users.created_at,
                cloud_saves.version, cloud_saves.updated_at, cloud_saves.data_json
         FROM users
         LEFT JOIN cloud_saves ON cloud_saves.user_id = users.id
         ${filter}
         ORDER BY COALESCE(cloud_saves.updated_at, users.created_at) DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...parameters, limit, offset) as unknown as RawAdminUserRecord[]
    return { users: records.map(toAdminUserRecord), total: countRecord.total }
  }

  getAdminUser(userId: string): AdminUserRecord | undefined {
    const record = this.database
      .prepare(
        `SELECT users.id, users.username, users.created_at,
                cloud_saves.version, cloud_saves.updated_at, cloud_saves.data_json
         FROM users
         LEFT JOIN cloud_saves ON cloud_saves.user_id = users.id
         WHERE users.id = ?`,
      )
      .get(userId) as RawAdminUserRecord | undefined
    return record ? toAdminUserRecord(record) : undefined
  }

  listUsersWithSaves = (): AdminUserRecord[] => {
    const records = this.database
      .prepare(
        `SELECT users.id, users.username, users.created_at,
                cloud_saves.version, cloud_saves.updated_at, cloud_saves.data_json
         FROM users
         JOIN cloud_saves ON cloud_saves.user_id = users.id`,
      )
      .all() as unknown as RawAdminUserRecord[]
    return records.map(toAdminUserRecord)
  }

  putCloudSave(userId: string, baseVersion: number, data: unknown): CloudSaveRecord | undefined {
    const version: number = baseVersion + 1
    const updatedAt: number = Date.now()
    const serialized: string = JSON.stringify(data)
    const statement: StatementSync =
      baseVersion === 0
        ? this.database.prepare(`
            INSERT INTO cloud_saves (user_id, version, updated_at, data_json)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO NOTHING
          `)
        : this.database.prepare(`
            UPDATE cloud_saves
            SET version = ?, updated_at = ?, data_json = ?
            WHERE user_id = ? AND version = ?
          `)
    const result =
      baseVersion === 0
        ? statement.run(userId, version, updatedAt, serialized)
        : statement.run(version, updatedAt, serialized, userId, baseVersion)
    if (result.changes !== 1) return undefined
    return { version, updatedAt, data }
  }

  close(): void {
    this.database.close()
  }
}
