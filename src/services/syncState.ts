import type { LocalSaveSnapshot } from '@/services/cloudSave'

export interface PersistedSyncState {
  userId: string
  serverVersion: number
  serverSnapshot: LocalSaveSnapshot
  localBaseSnapshot: LocalSaveSnapshot
}

const DATABASE_NAME = 'StickerBookSyncDatabase'
const STORE_NAME = 'syncStates'
const DATABASE_VERSION = 1
const OWNER_KEY = 'sticker-book-local-owner'
const PENDING_PREFIX = 'sticker-book-sync-pending:'

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject): void => {
    const request: IDBOpenDBRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = (): void => {
      const db: IDBDatabase = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = (): void => resolve(request.result)
    request.onerror = (): void => reject(request.error)
  })

export const readSyncState = async (userId: string): Promise<PersistedSyncState | undefined> => {
  try {
    const db: IDBDatabase = await openDatabase()
    return await new Promise((resolve, reject): void => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readonly')
      const request: IDBRequest<PersistedSyncState | undefined> = transaction
        .objectStore(STORE_NAME)
        .get(userId)
      request.onsuccess = (): void => resolve(request.result)
      request.onerror = (): void => reject(request.error)
      transaction.oncomplete = (): void => db.close()
    })
  } catch {
    return undefined
  }
}

export const writeSyncState = async (state: PersistedSyncState): Promise<void> => {
  try {
    const db: IDBDatabase = await openDatabase()
    await new Promise<void>((resolve, reject): void => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(state, state.userId)
      transaction.oncomplete = (): void => {
        db.close()
        resolve()
      }
      transaction.onerror = (): void => reject(transaction.error)
      transaction.onabort = (): void => reject(transaction.error)
    })
  } catch {
    // Основное сохранение всё равно остаётся в игровой IndexedDB. Метаданные
    // синхронизации не должны блокировать игру в браузерах с ограниченным storage.
  }
}

export const getLocalOwner = (): string | null => {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

export const setLocalOwner = (userId: string): void => {
  try {
    localStorage.setItem(OWNER_KEY, userId)
  } catch {
    // IndexedDB с игровыми данными остаётся основной локальной копией.
  }
}

export const hasPendingSync = (userId: string): boolean => {
  try {
    return localStorage.getItem(`${PENDING_PREFIX}${userId}`) === 'true'
  } catch {
    return true
  }
}

export const setPendingSync = (userId: string, pending: boolean): void => {
  try {
    const key: string = `${PENDING_PREFIX}${userId}`
    if (pending) localStorage.setItem(key, 'true')
    else localStorage.removeItem(key)
  } catch {
    // Повторная отправка в текущей вкладке продолжит работать через in-memory dirty flag.
  }
}
