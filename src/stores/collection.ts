import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type DuplicateExchange } from '@/db/database'
import { reconcileOrphanedDuplicates } from '@/db/stickerLifecycle'
import type { CollectionItem, StickerInstance, StickerPlacement } from '@/types'
import cards, { catalogs } from '@/data/wc-26/catalog'
import albumData from '@/data/wc-26/album'
import { DUPLICATE_EXCHANGE_CONFIG } from '@/data/mainConst'
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

  // Считает размер коллекции по уникальным позициям альбома, не учитывая версии карточек.
  const cardAlbumSlotIds: Map<string, string> = new Map(
    cards.map(({ id, baseCardId }): [string, string] => [id, baseCardId ?? id]),
  )
  const total: number = new Set(cards.map(({ id, baseCardId }): string => baseCardId ?? id)).size
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
              catalogs,
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

  // Сохраняет одну отображаемую версию, не меняя статус остальных вклеенных карточек слота.
  const setAlbumDisplay = async (instanceId: string, slotId: string): Promise<void> => {
    const normalizedSlotId: string = slotId.replace(/-slot$/, '')
    const albumItems: CollectionItem[] = items.value.filter(
      ({ instance }): boolean =>
        instance.location === 'album' &&
        (instance.placement?.slotId ?? '').replace(/-slot$/, '') === normalizedSlotId,
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
      (item: CollectionItem): CollectionItem =>
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

  // Объединяет обычные и особые версии карточки в одну найденную позицию альбома.
  const collectedAlbumSlotIds: ComputedRef<Set<string>> = computed(
    (): Set<string> =>
      new Set(
        items.value
          .filter(({ instance }): boolean => instance.location !== 'deleted')
          .map(({ instance }): string | undefined =>
            cardAlbumSlotIds.get(instance.playerId),
          )
          .filter((slotId: string | undefined): slotId is string => Boolean(slotId)),
      ),
  )
  const collectedTotal: ComputedRef<number> = computed(
    (): number => collectedAlbumSlotIds.value.size,
  )

  // Вычисляет процент найденных уникальных позиций текущей коллекции.
  const progress: ComputedRef<number> = computed((): number =>
    total ? Math.min(100, Math.round((collectedTotal.value / total) * 100)) : 0,
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
    collectedTotal,
    isLoaded,
    isExchanging,
    total,
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
    setAlbumDisplay,
    updateCard,
  }
})
