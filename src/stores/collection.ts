import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type DuplicateExchange } from '@/db/database'
import { reconcileOrphanedDuplicates } from '@/db/stickerLifecycle'
import type { CollectionItem, StickerInstance, StickerPlacement } from '@/types'
import collectionData from '@/data/collection.json'
import cards from '@/data/wc-26/players'
import albumData from '@/data/wc-26/album'
import gameData from '@/data/mainConst.json'
import { createId } from '@/utils/createId'
import { createDuplicateExchangeCandidates } from '@/utils/createDuplicateExchangeCandidates'

export type BeginDuplicateExchangeResult = 'started' | 'invalid-selection' | 'pending-exists'
export type ClaimDuplicateExchangeResult = 'claimed' | 'invalid-choice'

export const useCollectionStore = defineStore('collection', () => {
  const items: Ref<CollectionItem[]> = ref([])
  const duplicates: Ref<StickerInstance[]> = ref([])
  const pendingExchange: Ref<DuplicateExchange | undefined> = ref(undefined)
  const isLoaded: Ref<boolean> = ref(false)
  const isExchanging: Ref<boolean> = ref(false)

  // Загружает общие параметры коллекции из JSON-данных
  const total: number = collectionData.total
  const pages: number = collectionData.pages
  const albumSlotIds: Set<string> = new Set(
    albumData.pages.flatMap(({ slots }): string[] =>
      slots.map(({ id }): string => id),
    ),
  )

  // Восстанавливает уже открытые карточки из локальной коллекции
  const load = async (): Promise<void> => {
    await reconcileOrphanedDuplicates()
    const cards: StickerInstance[] = await database.cards.toArray()
    duplicates.value = await database.duplicates.toArray()
    pendingExchange.value = await database.duplicateExchanges.get('pending')
    items.value = cards.map(
      (instance: StickerInstance): CollectionItem => ({
        instance,
        duplicateCount: duplicates.value.filter(
          ({ playerId }): boolean => playerId === instance.playerId,
        ).length,
      }),
    )
    isLoaded.value = true
  }

  // Сохраняет новый экземпляр в основной коллекции или в повторках внутри текущей транзакции.
  const storeCardInstance = async (playerId: string): Promise<StickerInstance> => {
    const instance: StickerInstance = {
      id: createId(),
      playerId,
      quality: 100,
      location: 'inventory',
    }
    const card: StickerInstance | undefined = await database.cards
      .where('playerId')
      .equals(playerId)
      .filter(({ location }: StickerInstance): boolean => location !== 'deleted')
      .first()
    if (!card) {
      await database.cards.add(instance)
      return instance
    }

    const duplicate: StickerInstance = { ...instance, location: 'duplicate' }
    await database.duplicates.add(duplicate)
    return duplicate
  }

  // Добавляет карточку в коллекцию и не создаёт лишнюю запись при повторном выпадении
  const addCard = async (playerId: string): Promise<StickerInstance> => {
    const storedInstance: StickerInstance = await database.transaction(
      'rw',
      database.cards,
      database.duplicates,
      async (): Promise<StickerInstance> => storeCardInstance(playerId),
    )
    if (storedInstance.location === 'duplicate') {
      duplicates.value = [...duplicates.value, storedInstance]
      items.value = items.value.map(
        (item: CollectionItem): CollectionItem =>
          item.instance.playerId === playerId
            ? { ...item, duplicateCount: item.duplicateCount + 1 }
            : item,
      )
    } else {
      items.value = [...items.value, { instance: storedInstance, duplicateCount: 0 }]
    }
    return storedInstance
  }

  // Безвозвратно удаляет выбранные повторы и атомарно сохраняет пять кандидатов для выбора.
  const beginDuplicateExchange = async (
    instanceIds: string[],
  ): Promise<BeginDuplicateExchangeResult> => {
    const uniqueIds: string[] = Array.from(new Set(instanceIds))
    if (uniqueIds.length !== gameData.duplicateExchange.tradeInCount || isExchanging.value) {
      return 'invalid-selection'
    }
    isExchanging.value = true

    try {
      const result: BeginDuplicateExchangeResult = await database.transaction(
        'rw',
        database.duplicates,
        database.duplicateExchanges,
        async (): Promise<BeginDuplicateExchangeResult> => {
          const pending: DuplicateExchange | undefined =
            await database.duplicateExchanges.get('pending')
          if (pending) return 'pending-exists'

          const selected: Array<StickerInstance | undefined> =
            await database.duplicates.bulkGet(uniqueIds)
          if (selected.some((instance): boolean => !instance)) return 'invalid-selection'
          const selectedInstances: StickerInstance[] = selected.filter(
            (instance: StickerInstance | undefined): instance is StickerInstance =>
              Boolean(instance),
          )
          const excludedPlayerIds: Set<string> = new Set(
            selectedInstances.map(({ playerId }): string => playerId),
          )
          const exchange: DuplicateExchange = {
            id: 'pending',
            candidatePlayerIds: createDuplicateExchangeCandidates(
              cards,
              excludedPlayerIds,
              gameData.duplicateExchange.candidateCount,
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

  // Добавляет только выбранного кандидата и закрывает незавершённый обмен одной транзакцией.
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
        async (): Promise<ClaimDuplicateExchangeResult> => {
          const pending: DuplicateExchange | undefined =
            await database.duplicateExchanges.get('pending')
          if (!pending?.candidatePlayerIds.includes(playerId)) return 'invalid-choice'
          await storeCardInstance(playerId)
          await database.duplicateExchanges.delete('pending')
          return 'claimed'
        },
      )
      await load()
      return result
    } finally {
      isExchanging.value = false
    }
  }

  // Сохраняет качество и положение выбранного экземпляра наклейки в коллекции
  const updateCard = async (
    instanceId: string,
    changes: Partial<Pick<StickerInstance, 'quality' | 'location' | 'preparation'>> & {
      placement?: StickerPlacement
    },
  ): Promise<void> => {
    await database.cards.update(instanceId, changes)
    items.value = items.value.map(
      (item: CollectionItem): CollectionItem =>
        item.instance.id === instanceId
          ? { ...item, instance: { ...item.instance, ...changes } }
          : item,
    )
  }

  // Вычисляет процент найденных стикеров текущей коллекции
  const progress: ComputedRef<number> = computed((): number =>
    Math.round(
      (items.value.filter(({ instance }): boolean => instance.location !== 'deleted').length /
        total) *
        100,
    ),
  )

  // Считает бонусный прогресс только по уникальным занятым слотам текущего журнала.
  const albumProgress: ComputedRef<number> = computed((): number => {
    if (!albumSlotIds.size) return 0

    const occupiedSlotIds: Set<string> = new Set(
      items.value
        .filter(({ instance }): boolean => instance.location === 'album')
        .map(({ instance }): string => (instance.placement?.slotId ?? '').replace(/-slot$/, ''))
        .filter((slotId: string): boolean => albumSlotIds.has(slotId)),
    )
    return Math.min(100, Math.round((occupiedSlotIds.size / albumSlotIds.size) * 100))
  })

  void load()

  return {
    items,
    duplicates,
    pendingExchange,
    collected: computed((): string[] =>
      items.value
        .filter(({ instance }): boolean => instance.location !== 'deleted')
        .map(({ instance }): string => instance.playerId),
    ),
    duplicateTotal: computed((): number => duplicates.value.length),
    isLoaded,
    isExchanging,
    total,
    pages,
    progress,
    albumProgress,
    stickerInventory: computed((): CollectionItem[] =>
      items.value.filter(({ instance }): boolean =>
        ['inventory', 'collection'].includes(instance.location),
      ),
    ),
    addCard,
    beginDuplicateExchange,
    claimDuplicateExchange,
    load,
    updateCard,
  }
})
