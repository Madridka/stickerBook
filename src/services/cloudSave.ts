import Dexie, { type Table } from 'dexie'
import { ref, type Ref } from 'vue'
import { database } from '@/db/database'
import { ApiError, apiRequest } from '@/services/api'

interface CloudTableSnapshot {
  name: string
  rows: unknown[]
}

interface CloudSnapshot {
  schemaVersion: 1
  tables: CloudTableSnapshot[]
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

const SYNC_DEBOUNCE_MS: number = 600
const POLL_INTERVAL_MS: number = 15_000

const asGenericTable = (table: Table): Table<unknown, unknown, unknown> =>
  table as Table<unknown, unknown, unknown>

const exportSnapshot = async (): Promise<CloudSnapshot> => ({
  schemaVersion: 1,
  tables: await Promise.all(
    database.tables.map(async (rawTable): Promise<CloudTableSnapshot> => {
      const table = asGenericTable(rawTable)
      return { name: table.name, rows: await table.toArray() }
    }),
  ),
})

const parseSnapshot = (value: unknown): CloudSnapshot => {
  if (!value || typeof value !== 'object') throw new Error('Invalid cloud save')
  const candidate = value as Partial<CloudSnapshot>
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.tables)) {
    throw new Error('Unsupported cloud save schema')
  }
  const tables: CloudTableSnapshot[] = candidate.tables.map((table): CloudTableSnapshot => {
    if (
      !table ||
      typeof table !== 'object' ||
      typeof table.name !== 'string' ||
      !Array.isArray(table.rows)
    ) {
      throw new Error('Invalid cloud save table')
    }
    return { name: table.name, rows: table.rows }
  })
  return { schemaVersion: 1, tables }
}

const replaceLocalData = async (snapshot: CloudSnapshot): Promise<void> => {
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

export const exportLocalSaveJson = async (): Promise<string> =>
  JSON.stringify(await exportSnapshot(), null, 2)

export const clearLocalGameData = async (): Promise<void> => {
  await database.transaction('rw', database.tables, async (): Promise<void> => {
    for (const rawTable of database.tables) await asGenericTable(rawTable).clear()
  })
}

class CloudSaveService {
  private version: number = 0
  private localRevision: number = 0
  private dirty: boolean = false
  private isApplyingRemote: boolean = false
  private savePromise: Promise<void> | undefined
  private debounceTimer: number | undefined
  private pollTimer: number | undefined
  private started: boolean = false

  private readonly handleStorageMutation = (): void => {
    if (!this.started || this.isApplyingRemote) return
    this.localRevision += 1
    this.dirty = true
    this.scheduleSave()
  }

  async initialize(useLocalDataWhenEmpty: boolean): Promise<void> {
    this.stop()
    cloudSyncStatus.value = 'loading'
    const response: CloudSaveResponse = await apiRequest('/api/save')
    this.isApplyingRemote = true
    try {
      if (response.save) {
        await replaceLocalData(parseSnapshot(response.save.data))
        this.version = response.save.version
      } else {
        if (!useLocalDataWhenEmpty) await clearLocalGameData()
        this.version = 0
        this.dirty = true
      }
    } finally {
      this.isApplyingRemote = false
    }
    this.started = true
    Dexie.on.storagemutated.subscribe(this.handleStorageMutation)
    if (this.dirty) await this.flush()
    cloudSyncStatus.value = 'saved'
    this.pollTimer = window.setInterval((): void => void this.poll(), POLL_INTERVAL_MS)
  }

  private scheduleSave(): void {
    if (this.debounceTimer !== undefined) window.clearTimeout(this.debounceTimer)
    this.debounceTimer = window.setTimeout(
      (): void => void this.flush().catch((): undefined => undefined),
      SYNC_DEBOUNCE_MS,
    )
  }

  async flush(): Promise<void> {
    if (!this.started || !this.dirty) return
    if (this.savePromise) return this.savePromise
    this.savePromise = this.saveCurrentSnapshot().finally((): void => {
      this.savePromise = undefined
      if (this.dirty && cloudSyncStatus.value !== 'conflict') this.scheduleSave()
    })
    return this.savePromise
  }

  // Проверяет и целиком заменяет локальный снимок, после чего сразу отправляет его в аккаунт.
  async importLocalSaveJson(value: string): Promise<void> {
    const snapshot: CloudSnapshot = parseSnapshot(JSON.parse(value) as unknown)
    this.isApplyingRemote = true
    try {
      await replaceLocalData(snapshot)
    } finally {
      this.isApplyingRemote = false
    }
    this.localRevision += 1
    this.dirty = true
    if (this.started) await this.flush()
  }

  private async saveCurrentSnapshot(): Promise<void> {
    const revision: number = this.localRevision
    cloudSyncStatus.value = 'saving'
    try {
      const snapshot: CloudSnapshot = await exportSnapshot()
      const response: CloudSaveResponse = await apiRequest('/api/save', {
        method: 'PUT',
        body: JSON.stringify({ baseVersion: this.version, data: snapshot }),
      })
      if (!response.save) throw new Error('Server returned an empty save')
      this.version = response.save.version
      this.dirty = this.localRevision !== revision
      cloudSyncStatus.value = this.dirty ? 'saving' : 'saved'
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        cloudSyncStatus.value = 'conflict'
        throw error
      }
      cloudSyncStatus.value = 'offline'
      this.dirty = true
      throw error
    }
  }

  private async poll(): Promise<void> {
    if (!this.started || this.dirty || this.savePromise) return
    try {
      const response: CloudSaveResponse = await apiRequest('/api/save')
      if (!response.save || response.save.version <= this.version) return
      this.isApplyingRemote = true
      try {
        await replaceLocalData(parseSnapshot(response.save.data))
        this.version = response.save.version
        cloudSyncStatus.value = 'saved'
        window.location.reload()
      } finally {
        this.isApplyingRemote = false
      }
    } catch {
      cloudSyncStatus.value = 'offline'
    }
  }

  stop(): void {
    if (this.started) Dexie.on.storagemutated.unsubscribe(this.handleStorageMutation)
    if (this.debounceTimer !== undefined) window.clearTimeout(this.debounceTimer)
    if (this.pollTimer !== undefined) window.clearInterval(this.pollTimer)
    this.debounceTimer = undefined
    this.pollTimer = undefined
    this.started = false
    this.dirty = false
    this.savePromise = undefined
    this.version = 0
    this.localRevision = 0
    cloudSyncStatus.value = 'idle'
  }
}

export const cloudSave = new CloudSaveService()
