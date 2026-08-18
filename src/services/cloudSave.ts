import Dexie, { type Table } from 'dexie'
import { ref, type Ref } from 'vue'
import { SERVER_SYNC_CONFIG } from '@/config/runtimeConfig'
import { database } from '@/db/database'
import { ApiError, apiRequest } from '@/services/api'
import { mergeSaveSnapshots } from '@/services/saveMerge'
import {
  getLocalOwner,
  hasPendingSync,
  readSyncState,
  setLocalOwner,
  setPendingSync,
  writeSyncState,
  type PersistedSyncState,
} from '@/services/syncState'

export interface LocalSaveTableSnapshot {
  name: string
  rows: unknown[]
}

export interface LocalSaveSnapshot {
  schemaVersion: 1
  tables: LocalSaveTableSnapshot[]
}

interface CloudSave {
  version: number
  updatedAt: number
  data: unknown
}

interface CloudSaveResponse {
  save: CloudSave | null
}

export type CloudSyncStatus = 'idle' | 'loading' | 'saved' | 'saving' | 'offline' | 'conflict'

export const cloudSyncStatus: Ref<CloudSyncStatus> = ref('idle')

const EMPTY_SNAPSHOT: LocalSaveSnapshot = { schemaVersion: 1, tables: [] }

const asGenericTable = (table: Table): Table<unknown, unknown, unknown> =>
  table as Table<unknown, unknown, unknown>

export const exportLocalSave = async (): Promise<LocalSaveSnapshot> => ({
  schemaVersion: 1,
  tables: await Promise.all(
    database.tables.map(async (rawTable): Promise<LocalSaveTableSnapshot> => {
      const table = asGenericTable(rawTable)
      return { name: table.name, rows: await table.toArray() }
    }),
  ),
})

export const exportLocalSaveJson = async (): Promise<string> =>
  JSON.stringify(await exportLocalSave(), null, 2)

export const parseSnapshot = (value: unknown): LocalSaveSnapshot => {
  if (!value || typeof value !== 'object') throw new Error('Invalid cloud save')
  const candidate = value as Partial<LocalSaveSnapshot>
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.tables)) {
    throw new Error('Unsupported cloud save schema')
  }
  const tables: LocalSaveTableSnapshot[] = candidate.tables.map(
    (table): LocalSaveTableSnapshot => {
      if (
        !table ||
        typeof table !== 'object' ||
        typeof table.name !== 'string' ||
        !Array.isArray(table.rows)
      ) {
        throw new Error('Invalid cloud save table')
      }
      return { name: table.name, rows: table.rows }
    },
  )
  return { schemaVersion: 1, tables }
}

const snapshotsEqual = (left: LocalSaveSnapshot, right: LocalSaveSnapshot): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const replaceLocalData = async (snapshot: LocalSaveSnapshot): Promise<void> => {
  const rowsByTable: Map<string, unknown[]> = new Map(
    snapshot.tables.map(({ name, rows }): [string, unknown[]] => [name, rows]),
  )
  const knownNames: Set<string> = new Set(database.tables.map(({ name }): string => name))
  if ([...rowsByTable.keys()].some((name): boolean => !knownNames.has(name))) {
    throw new Error('Cloud save contains an unknown table')
  }

  await database.transaction('rw', database.tables, async (): Promise<void> => {
    for (const rawTable of database.tables) {
      const table = asGenericTable(rawTable)
      await table.clear()
      const rows: unknown[] = rowsByTable.get(table.name) ?? []
      if (rows.length) await table.bulkAdd(rows)
    }
  })
}

export const clearLocalGameData = async (): Promise<void> => {
  await database.transaction('rw', database.tables, async (): Promise<void> => {
    for (const rawTable of database.tables) await asGenericTable(rawTable).clear()
  })
}

const cloudSaveFromError = (error: ApiError): CloudSave | undefined => {
  const value: unknown = error.body.save
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<CloudSave>
  if (!Number.isInteger(candidate.version) || candidate.data === undefined) return undefined
  return candidate as CloudSave
}

class CloudSaveService {
  private userId: string | undefined
  private syncState: PersistedSyncState | undefined
  private localRevision: number = 0
  private dirty: boolean = false
  private isApplyingRemote: boolean = false
  private savePromise: Promise<void> | undefined
  private debounceTimer: number | undefined
  private pollTimer: number | undefined
  private started: boolean = false
  private retryDelayMs: number = SERVER_SYNC_CONFIG.saveDebounceMs

  private readonly handleStorageMutation = (): void => {
    if (!this.started || this.isApplyingRemote || !this.userId) return
    this.localRevision += 1
    this.dirty = true
    setPendingSync(this.userId, true)
    this.scheduleSave()
  }

  private readonly handleOnline = (): void => {
    this.retryDelayMs = SERVER_SYNC_CONFIG.saveDebounceMs
    if (this.dirty) void this.flush().catch((): undefined => undefined)
    else void this.poll()
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') this.handleOnline()
  }

  private start = (): void => {
    this.started = true
    Dexie.on.storagemutated.subscribe(this.handleStorageMutation)
    window.addEventListener('online', this.handleOnline)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.pollTimer = window.setInterval(
      (): void => void this.poll(),
      SERVER_SYNC_CONFIG.pollIntervalMs,
    )
  }

  initialize = async (userId: string, useLocalDataWhenEmpty: boolean): Promise<void> => {
    this.stop()
    this.userId = userId
    cloudSyncStatus.value = 'loading'

    const [response, savedState] = await Promise.all([
      apiRequest<CloudSaveResponse>('/api/save'),
      readSyncState(userId),
    ])
    const ownsLocalData: boolean = getLocalOwner() === userId
    const hasLocalChanges: boolean = ownsLocalData && hasPendingSync(userId)
    const remoteSnapshot: LocalSaveSnapshot | undefined = response.save
      ? parseSnapshot(response.save.data)
      : undefined

    this.isApplyingRemote = true
    try {
      if (remoteSnapshot && hasLocalChanges) {
        const localSnapshot: LocalSaveSnapshot = await exportLocalSave()
        const alreadySynchronized: boolean = snapshotsEqual(localSnapshot, remoteSnapshot)
        this.syncState = {
          userId,
          serverVersion: response.save!.version,
          serverSnapshot: remoteSnapshot,
          localBaseSnapshot: alreadySynchronized
            ? remoteSnapshot
            : (savedState?.localBaseSnapshot ?? savedState?.serverSnapshot ?? EMPTY_SNAPSHOT),
        }
        this.dirty = !alreadySynchronized
      } else if (remoteSnapshot) {
        await replaceLocalData(remoteSnapshot)
        this.syncState = {
          userId,
          serverVersion: response.save!.version,
          serverSnapshot: remoteSnapshot,
          localBaseSnapshot: remoteSnapshot,
        }
      } else if (useLocalDataWhenEmpty) {
        this.syncState = {
          userId,
          serverVersion: 0,
          serverSnapshot: EMPTY_SNAPSHOT,
          localBaseSnapshot: EMPTY_SNAPSHOT,
        }
        this.dirty = true
        setPendingSync(userId, true)
      } else {
        await clearLocalGameData()
        this.syncState = {
          userId,
          serverVersion: 0,
          serverSnapshot: EMPTY_SNAPSHOT,
          localBaseSnapshot: EMPTY_SNAPSHOT,
        }
      }
    } finally {
      this.isApplyingRemote = false
    }

    setLocalOwner(userId)
    if (this.syncState) await writeSyncState(this.syncState)
    this.start()
    if (this.dirty) await this.flush()
    else {
      setPendingSync(userId, false)
      cloudSyncStatus.value = 'saved'
    }
  }

  /** Оставляет игру доступной с локальными данными, пока сервер недоступен. */
  initializeOffline = async (userId: string): Promise<void> => {
    this.stop()
    this.userId = userId
    this.syncState = await readSyncState(userId)
    setLocalOwner(userId)
    this.dirty = hasPendingSync(userId)
    this.start()
    cloudSyncStatus.value = 'offline'
  }

  private readonly scheduleSave = (delayMs: number = this.retryDelayMs): void => {
    if (this.debounceTimer !== undefined) window.clearTimeout(this.debounceTimer)
    this.debounceTimer = window.setTimeout(
      (): void => void this.flush().catch((): undefined => undefined),
      delayMs,
    )
  }

  flush = async (): Promise<void> => {
    if (!this.started || !this.dirty || !this.userId) return
    if (this.savePromise) {
      await this.savePromise
      if (this.dirty && cloudSyncStatus.value === 'saving') return this.flush()
      return
    }
    const currentSave: Promise<void> = this.saveCurrentSnapshot()
    this.savePromise = currentSave.finally((): void => {
      this.savePromise = undefined
      if (this.dirty) this.scheduleSave()
    })
    await this.savePromise
    if (this.dirty && cloudSyncStatus.value === 'saving') return this.flush()
  }

  private ensureSyncState = async (): Promise<PersistedSyncState> => {
    if (this.syncState) return this.syncState
    if (!this.userId) throw new Error('Cloud save is not initialized')
    const response: CloudSaveResponse = await apiRequest('/api/save')
    const remoteSnapshot: LocalSaveSnapshot = response.save
      ? parseSnapshot(response.save.data)
      : EMPTY_SNAPSHOT
    this.syncState = {
      userId: this.userId,
      serverVersion: response.save?.version ?? 0,
      serverSnapshot: remoteSnapshot,
      localBaseSnapshot: remoteSnapshot,
    }
    return this.syncState
  }

  private readonly saveCurrentSnapshot = async (): Promise<void> => {
    if (!this.userId) return
    cloudSyncStatus.value = 'saving'
    try {
      let state: PersistedSyncState = await this.ensureSyncState()

      for (let conflictAttempt: number = 0; conflictAttempt < 4; conflictAttempt += 1) {
        const revision: number = this.localRevision
        const localSnapshot: LocalSaveSnapshot = await exportLocalSave()
        const uploadSnapshot: LocalSaveSnapshot = mergeSaveSnapshots(
          state.localBaseSnapshot,
          localSnapshot,
          state.serverSnapshot,
        )

        try {
          const response: CloudSaveResponse = await apiRequest('/api/save', {
            method: 'PUT',
            body: JSON.stringify({ baseVersion: state.serverVersion, data: uploadSnapshot }),
          })
          if (!response.save) throw new Error('Server returned an empty save')

          const unchangedDuringRequest: boolean = this.localRevision === revision
          state = {
            userId: this.userId,
            serverVersion: response.save.version,
            serverSnapshot: uploadSnapshot,
            // До замены локальной БД она всё ещё является производной localSnapshot.
            // Это делает восстановление корректным даже при закрытии вкладки в этот момент.
            localBaseSnapshot: localSnapshot,
          }
          this.syncState = state
          await writeSyncState(state)

          if (unchangedDuringRequest) {
            const needsReload: boolean = !snapshotsEqual(localSnapshot, uploadSnapshot)
            if (needsReload) {
              this.isApplyingRemote = true
              try {
                await replaceLocalData(uploadSnapshot)
              } finally {
                this.isApplyingRemote = false
              }
            }
            state = { ...state, localBaseSnapshot: uploadSnapshot }
            this.syncState = state
            await writeSyncState(state)
            this.dirty = false
            setPendingSync(this.userId, false)
            this.retryDelayMs = SERVER_SYNC_CONFIG.saveDebounceMs
            cloudSyncStatus.value = 'saved'
            if (needsReload) window.location.reload()
          } else {
            this.dirty = true
            setPendingSync(this.userId, true)
            cloudSyncStatus.value = 'saving'
          }
          return
        } catch (error: unknown) {
          if (!(error instanceof ApiError && error.status === 409)) throw error
          const conflictSave: CloudSave | undefined = cloudSaveFromError(error)
          if (!conflictSave) throw error
          state = {
            ...state,
            serverVersion: conflictSave.version,
            serverSnapshot: parseSnapshot(conflictSave.data),
          }
          this.syncState = state
          await writeSyncState(state)
          cloudSyncStatus.value = 'conflict'
        }
      }
      cloudSyncStatus.value = 'conflict'
      throw new Error('Cloud save changed too many times during synchronization')
    } catch (error: unknown) {
      this.dirty = true
      setPendingSync(this.userId, true)
      this.retryDelayMs = Math.min(
        SERVER_SYNC_CONFIG.maxRetryDelayMs,
        Math.max(SERVER_SYNC_CONFIG.saveDebounceMs, this.retryDelayMs * 2),
      )
      if (
        !(error instanceof ApiError && error.status === 409) &&
        cloudSyncStatus.value !== 'conflict'
      ) {
        cloudSyncStatus.value = 'offline'
      }
      throw error
    }
  }

  private readonly poll = async (): Promise<void> => {
    if (!this.started || this.dirty || this.savePromise || !this.userId) return
    try {
      const response: CloudSaveResponse = await apiRequest('/api/save')
      const currentVersion: number = this.syncState?.serverVersion ?? 0
      if (!response.save || response.save.version <= currentVersion) {
        cloudSyncStatus.value = 'saved'
        return
      }
      const remoteSnapshot: LocalSaveSnapshot = parseSnapshot(response.save.data)
      this.isApplyingRemote = true
      try {
        await replaceLocalData(remoteSnapshot)
        this.syncState = {
          userId: this.userId,
          serverVersion: response.save.version,
          serverSnapshot: remoteSnapshot,
          localBaseSnapshot: remoteSnapshot,
        }
        await writeSyncState(this.syncState)
        setPendingSync(this.userId, false)
        cloudSyncStatus.value = 'saved'
        window.location.reload()
      } finally {
        this.isApplyingRemote = false
      }
    } catch {
      cloudSyncStatus.value = 'offline'
    }
  }

  stop = (): void => {
    if (this.started) Dexie.on.storagemutated.unsubscribe(this.handleStorageMutation)
    window.removeEventListener('online', this.handleOnline)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    if (this.debounceTimer !== undefined) window.clearTimeout(this.debounceTimer)
    if (this.pollTimer !== undefined) window.clearInterval(this.pollTimer)
    this.debounceTimer = undefined
    this.pollTimer = undefined
    this.started = false
    this.dirty = false
    this.savePromise = undefined
    this.userId = undefined
    this.syncState = undefined
    this.localRevision = 0
    this.retryDelayMs = SERVER_SYNC_CONFIG.saveDebounceMs
    cloudSyncStatus.value = 'idle'
  }
}

export const cloudSave = new CloudSaveService()
