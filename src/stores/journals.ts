import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database } from '@/db/database'
import { getJournalById } from '@/features/journals/registry'
import type {
  HistoricalJournalDefinition,
  JournalId,
  JournalProgressRecord,
} from '@/features/journals/types'

type JournalsProgressState = Partial<Record<JournalId, JournalProgressRecord>>

const uniqueAppend = (values: string[], value: string): string[] =>
  values.includes(value) ? values : [...values, value]

export const createDefaultJournalProgress = (journalId: JournalId): JournalProgressRecord => {
  const journal = getJournalById(journalId)
  const unlockedEraIds: string[] =
    journal?.type === 'historical'
      ? (journal as HistoricalJournalDefinition).spreads.map(({ id }): string => id)
      : []

  return {
    journalId,
    lastPage: 0,
    unlockedEraIds,
    viewedPlayerIds: [],
    openedBackPlayerIds: [],
    completedEraIds: [],
    updatedAt: Date.now(),
  }
}

export const useJournalsStore = defineStore('journals', () => {
  const progressByJournal: Ref<JournalsProgressState> = ref({})

  const normalizeProgress = (
    journalId: JournalId,
    saved?: JournalProgressRecord,
  ): JournalProgressRecord => {
    const fallback: JournalProgressRecord = createDefaultJournalProgress(journalId)
    if (!saved) return fallback
    return {
      ...fallback,
      ...saved,
      journalId,
      unlockedEraIds: saved.unlockedEraIds ?? fallback.unlockedEraIds,
      viewedPlayerIds: saved.viewedPlayerIds ?? [],
      openedBackPlayerIds: saved.openedBackPlayerIds ?? [],
      completedEraIds: saved.completedEraIds ?? [],
    }
  }

  const loadJournal = async (journalId: JournalId): Promise<JournalProgressRecord> => {
    const saved: JournalProgressRecord | undefined = await database.journalProgress.get(journalId)
    const progress: JournalProgressRecord = normalizeProgress(journalId, saved)
    progressByJournal.value = { ...progressByJournal.value, [journalId]: progress }
    return progress
  }

  const getProgress = (journalId: JournalId): JournalProgressRecord =>
    progressByJournal.value[journalId] ?? createDefaultJournalProgress(journalId)

  const persist = async (progress: JournalProgressRecord): Promise<void> => {
    // Dexie получает только plain-данные: вложенные массивы Pinia могут быть reactive Proxy.
    const next: JournalProgressRecord = {
      ...progress,
      unlockedEraIds: [...progress.unlockedEraIds],
      viewedPlayerIds: [...progress.viewedPlayerIds],
      openedBackPlayerIds: [...progress.openedBackPlayerIds],
      completedEraIds: [...progress.completedEraIds],
      updatedAt: Date.now(),
    }
    progressByJournal.value = { ...progressByJournal.value, [next.journalId]: next }
    await database.journalProgress.put(next)
  }

  const setLastPage = async (journalId: JournalId, lastPage: number): Promise<void> => {
    await persist({ ...getProgress(journalId), lastPage })
  }

  const markPlayerViewed = async (journalId: JournalId, playerId: string): Promise<void> => {
    const progress: JournalProgressRecord = getProgress(journalId)
    await persist({
      ...progress,
      viewedPlayerIds: uniqueAppend(progress.viewedPlayerIds, playerId),
    })
  }

  const markPlayerBackOpened = async (journalId: JournalId, playerId: string): Promise<void> => {
    const progress: JournalProgressRecord = getProgress(journalId)
    await persist({
      ...progress,
      viewedPlayerIds: uniqueAppend(progress.viewedPlayerIds, playerId),
      openedBackPlayerIds: uniqueAppend(progress.openedBackPlayerIds, playerId),
    })
  }

  return {
    progressByJournal,
    loadJournal,
    getProgress,
    setLastPage,
    markPlayerViewed,
    markPlayerBackOpened,
  }
})
