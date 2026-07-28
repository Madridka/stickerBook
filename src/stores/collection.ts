import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type DuplicateExchange } from '@/db/database'
import { reconcileOrphanedDuplicates } from '@/db/stickerLifecycle'
import type {
  AlbumId,
  AlbumProgress,
  CollectionItem,
  StickerInstance,
  StickerPlacement,
} from '@/types'
import { getAlbumById, requireAlbum } from '@/data/albumRegistry'
import { BLISTER_CONFIGS, DUPLICATE_EXCHANGE_CONFIG } from '@/data/mainConst'
import { createId } from '@/utils/createId'
import { createDuplicateExchangeCandidates } from '@/utils/createDuplicateExchangeCandidates'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'

export type BeginDuplicateExchangeResult = 'started' | 'invalid-selection' | 'pending-exists'
export type ClaimDuplicateExchangeResult = 'claimed' | 'invalid-choice'

const DEFAULT_ALBUM_ID: AlbumId = BLISTER_CONFIGS.standard.albumId
const normalizeSlotId = (slotId: string): string => slotId.replace(/-slot$/, '')

export const useCollectionStore = defineStore('collection', () => {
  const items: Ref<CollectionItem[]> = ref([])
  const duplicates: Ref<StickerInstance[]> = ref([])
  const pendingExchange: Ref<DuplicateExchange | undefined> = ref(undefined)
  const isLoaded: Ref<boolean> = ref(false)
  const isExchanging: Ref<boolean> = ref(false)

  const getAlbumItems = (albumId: AlbumId): CollectionItem[] =>
    items.value.filter(({ instance }): boolean => instance.albumId === albumId)

  const getAlbumDuplicates = (albumId: AlbumId): StickerInstance[] =>
    duplicates.value.filter((instance): boolean => instance.albumId === albumId)

  const getCollectedCardIds = (albumId: AlbumId): Set<string> => {
    const catalogIds: Set<string> = new Set(
      (getAlbumById(albumId)?.cards ?? []).map(({ id }): string => id),
    )
    return new Set(
      getAlbumItems(albumId)
        .filter(
          ({ instance }): boolean =>
            instance.location !== 'deleted' && catalogIds.has(instance.playerId),
        )
        .map(({ instance }): string => instance.playerId),
    )
  }

  // Возвращает независимый снимок прогресса выбранного журнала.
  const getAlbumProgress = (albumId: AlbumId): AlbumProgress => {
    const album = getAlbumById(albumId)
    const totalCards: number = album?.cards.length ?? 0
    const collectedCards: number = getCollectedCardIds(albumId).size
    const slotIds: Set<string> = new Set(
      (album?.pages ?? []).flatMap(({ slots }) => slots.map(({ id }) => id)),
    )
    const placedCards: number = new Set(
      getAlbumItems(albumId)
        .filter(({ instance }): boolean => instance.location === 'album')
        .map(({ instance }): string => normalizeSlotId(instance.placement?.slotId ?? ''))
        .filter((slotId): boolean => slotIds.has(slotId)),
    ).size
    return {
      albumId,
      totalCards,
      collectedCards,
      placedCards,
      duplicateCards: getAlbumDuplicates(albumId).length,
      completionPercent: totalCards
        ? Math.min(100, Math.round((collectedCards / totalCards) * 100))
        : 0,
    }
  }

  // Восстанавливает карточки всех журналов из общей локальной базы.
  const load = async (): Promise<void> => {
    await reconcileOrphanedDuplicates()
    const storedCards: StickerInstance[] = await database.cards.toArray()
    duplicates.value = await database.duplicates.toArray()
    pendingExchange.value = await database.duplicateExchanges.get('pending')
    items.value = storedCards.map(
      (instance: StickerInstance): CollectionItem => ({
        instance,
        duplicateCount: duplicates.value.filter(
          (duplicate): boolean =>
            duplicate.albumId === instance.albumId &&
            duplicate.playerId === instance.playerId,
        ).length,
      }),
    )
    isLoaded.value = true
  }

  // Сохраняет экземпляр в контексте журнала и исключает межальбомные конфликты id.
  const storeCardInstance = async (
    albumId: AlbumId,
    playerId: string,
    instanceId: string = createId(),
  ): Promise<StickerInstance> => {
    if (!requireAlbum(albumId).cards.some(({ id }): boolean => id === playerId)) {
      throw new Error(`Unknown card ${albumId}:${playerId}`)
    }
    const instance: StickerInstance = {
      id: instanceId,
      albumId,
      playerId,
      quality: 100,
      location: 'inventory',
    }
    const card: StickerInstance | undefined = await database.cards
      .where('[albumId+playerId]')
      .equals([albumId, playerId])
      .filter(({ location }): boolean => location !== 'deleted')
      .first()
    if (!card) {
      await database.cards.add(instance)
      return instance
    }

    const duplicate: StickerInstance = { ...instance, location: 'duplicate' }
    await database.duplicates.add(duplicate)
    return duplicate
  }

  const addCard = async (
    playerId: string,
    albumId: AlbumId = DEFAULT_ALBUM_ID,
  ): Promise<StickerInstance> => {
    const storedInstance: StickerInstance = await database.transaction(
      'rw',
      database.cards,
      database.duplicates,
      async (): Promise<StickerInstance> => storeCardInstance(albumId, playerId),
    )
    await load()
    return storedInstance
  }

  // Обмен разрешён только для повторок одного журнала и сохраняет его контекст.
  const beginDuplicateExchange = async (
    instanceIds: string[],
  ): Promise<BeginDuplicateExchangeResult> => {
    const uniqueIds: string[] = Array.from(new Set(instanceIds))
    if (uniqueIds.length !== DUPLICATE_EXCHANGE_CONFIG.tradeInCount || isExchanging.value) {
      return 'invalid-selection'
    }
    isExchanging.value = true

    try {
      const result: BeginDuplicateExchangeResult = await database.transaction(
        'rw',
        database.duplicates,
        database.duplicateExchanges,
        async (): Promise<BeginDuplicateExchangeResult> => {
          if (await database.duplicateExchanges.get('pending')) return 'pending-exists'
          const selected = await database.duplicates.bulkGet(uniqueIds)
          if (selected.some((instance): boolean => !instance)) return 'invalid-selection'
          const selectedInstances: StickerInstance[] = selected.filter(
            (instance): instance is StickerInstance => Boolean(instance),
          )
          const albumIds: Set<AlbumId> = new Set(
            selectedInstances.map(({ albumId }): AlbumId => albumId),
          )
          if (albumIds.size !== 1) return 'invalid-selection'
          const albumId: AlbumId = selectedInstances[0].albumId
          const excludedPlayerIds: Set<string> = new Set(
            selectedInstances.map(({ playerId }): string => playerId),
          )
          const exchange: DuplicateExchange = {
            id: 'pending',
            albumId,
            candidatePlayerIds: createDuplicateExchangeCandidates(
              requireAlbum(albumId).catalogs,
              excludedPlayerIds,
              DUPLICATE_EXCHANGE_CONFIG.candidateCount,
            ),
            createdAt: Date.now(),
          }

          await database.duplicates.bulkDelete(uniqueIds)
          await database.duplicateExchanges.put(exchange)
          return 'started'
        },
      )
      await load()
      return result
    } finally {
      isExchanging.value = false
    }
  }

  const claimDuplicateExchange = async (
    playerId: string,
  ): Promise<ClaimDuplicateExchangeResult> => {
    if (isExchanging.value) return 'invalid-choice'
    isExchanging.value = true

    try {
      const result: ClaimDuplicateExchangeResult = await database.transaction(
        'rw',
        database.cards,
        database.duplicates,
        database.duplicateExchanges,
        database.goalCounters,
        async (): Promise<ClaimDuplicateExchangeResult> => {
          const pending: DuplicateExchange | undefined =
            await database.duplicateExchanges.get('pending')
          if (!pending?.candidatePlayerIds.includes(playerId)) return 'invalid-choice'
          await storeCardInstance(pending.albumId, playerId)
          await database.duplicateExchanges.delete('pending')
          const counter = await database.goalCounters.get('duplicates-exchanged')
          await database.goalCounters.put({
            id: 'duplicates-exchanged',
            value: (counter?.value ?? 0) + 1,
            updatedAt: Date.now(),
          })
          return 'claimed'
        },
      )
      if (result === 'claimed') notifyGoalsChanged()
      await load()
      return result
    } finally {
      isExchanging.value = false
    }
  }

  const updateCard = async (
    instanceId: string,
    changes: Partial<Pick<StickerInstance, 'quality' | 'location' | 'preparation'>> & {
      placement?: StickerPlacement
    },
  ): Promise<void> => {
    await database.cards.update(instanceId, changes)
    items.value = items.value.map(
      (item): CollectionItem =>
        item.instance.id === instanceId
          ? { ...item, instance: { ...item.instance, ...changes } }
          : item,
    )
  }

  const setAlbumDisplay = async (instanceId: string, slotId: string): Promise<void> => {
    const selected: CollectionItem | undefined = items.value.find(
      ({ instance }): boolean => instance.id === instanceId,
    )
    if (!selected) return
    const normalizedSlotId: string = normalizeSlotId(slotId)
    const albumItems: CollectionItem[] = items.value.filter(
      ({ instance }): boolean =>
        instance.albumId === selected.instance.albumId &&
        instance.location === 'album' &&
        normalizeSlotId(instance.placement?.slotId ?? '') === normalizedSlotId,
    )
    if (!albumItems.some(({ instance }): boolean => instance.id === instanceId)) return

    await database.transaction('rw', database.cards, async (): Promise<void> => {
      await Promise.all(
        albumItems.map(({ instance }): Promise<number> =>
          database.cards.update(instance.id, { isAlbumDisplay: instance.id === instanceId }),
        ),
      )
    })
    const albumInstanceIds: Set<string> = new Set(
      albumItems.map(({ instance }): string => instance.id),
    )
    items.value = items.value.map(
      (item): CollectionItem =>
        albumInstanceIds.has(item.instance.id)
          ? {
              ...item,
              instance: {
                ...item.instance,
                isAlbumDisplay: item.instance.id === instanceId,
              },
            }
          : item,
    )
  }

  const defaultProgress: ComputedRef<AlbumProgress> = computed(() =>
    getAlbumProgress(DEFAULT_ALBUM_ID),
  )

  void load()

  return {
    items,
    duplicates,
    pendingExchange,
    isLoaded,
    isExchanging,
    total: computed((): number => defaultProgress.value.totalCards),
    collectedTotal: computed((): number => defaultProgress.value.collectedCards),
    duplicateTotal: computed((): number => defaultProgress.value.duplicateCards),
    progress: computed((): number => defaultProgress.value.completionPercent),
    albumProgress: computed((): number => {
      const album = getAlbumById(DEFAULT_ALBUM_ID)
      const slotCount: number =
        album?.pages.reduce((total, page): number => total + page.slots.length, 0) ?? 0
      return slotCount
        ? Math.min(100, Math.round((defaultProgress.value.placedCards / slotCount) * 100))
        : 0
    }),
    collected: computed((): string[] => Array.from(getCollectedCardIds(DEFAULT_ALBUM_ID))),
    stickerInventory: computed((): CollectionItem[] =>
      items.value.filter(({ instance }): boolean =>
        ['inventory', 'collection'].includes(instance.location),
      ),
    ),
    addCard,
    beginDuplicateExchange,
    claimDuplicateExchange,
    getAlbumDuplicates,
    getAlbumItems,
    getAlbumProgress,
    getCollectedCardIds,
    load,
    setAlbumDisplay,
    storeCardInstance,
    updateCard,
  }
})
