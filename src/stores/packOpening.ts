import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import {
  database,
  type InventoryItem,
  type PackOpeningReward,
  type PackOpeningSession,
} from '@/db/database'
import { catalogs } from '@/data/wc-26/catalog'
import packData from '@/data/mainConst.json'
import type { CardDefinition, StickerInstance } from '@/types'
import { createId } from '@/utils/createId'
import { selectCardV2 } from '@/utils/dropEngine'

export type AdvancePackOpeningResult = 'advanced' | 'completed' | 'unavailable'

export const usePackOpeningStore = defineStore('packOpening', () => {
  const session: Ref<PackOpeningSession | undefined> = ref(undefined)
  const isLoaded: Ref<boolean> = ref(false)
  const isStarting: Ref<boolean> = ref(false)
  const isAdvancing: Ref<boolean> = ref(false)

  // Загружает сохранённый прогресс, чтобы продолжить показ с той же карточки.
  const load = async (): Promise<PackOpeningSession | undefined> => {
    session.value = await database.packOpeningSessions.get('pending')
    isLoaded.value = true
    return session.value
  }

  // Один раз рассчитывает содержимое пака и резервирует его сохраняемой сессией.
  const start = async (): Promise<PackOpeningSession | undefined> => {
    if (isStarting.value) return session.value
    isStarting.value = true

    try {
      const opening: PackOpeningSession | undefined = await database.transaction(
        'rw',
        database.inventory,
        database.cards,
        database.packOpeningSessions,
        async (): Promise<PackOpeningSession | undefined> => {
          const pending: PackOpeningSession | undefined =
            await database.packOpeningSessions.get('pending')
          if (pending) return pending

          const pack: InventoryItem | undefined = await database.inventory
            .orderBy('createdAt')
            .filter(({ type }: InventoryItem): boolean => type === 'pack')
            .first()
          if (!pack) return undefined

          const activeCards: StickerInstance[] = await database.cards
            .filter(({ location }: StickerInstance): boolean => location !== 'deleted')
            .toArray()
          const ownedPlayerIds: Set<string> = new Set(
            activeCards.map(({ playerId }: StickerInstance): string => playerId),
          )
          const rewards: PackOpeningReward[] = Array.from(
            { length: packData.packConfigs.standard.cardsPerPack },
            (): PackOpeningReward => {
              const card: CardDefinition = selectCardV2({
                catalogs,
                packConfig: packData.packConfigs.standard,
                poolId: 'standard',
                defaultSelectionWeight: packData.dropEngine.defaultSelectionWeight,
                randomSource: Math.random,
              }) as CardDefinition
              const isDuplicate: boolean = ownedPlayerIds.has(card.id)
              ownedPlayerIds.add(card.id)
              return { instanceId: createId(), playerId: card.id, isDuplicate }
            },
          )
          const created: PackOpeningSession = {
            id: 'pending',
            packId: pack.id,
            rewards,
            currentIndex: 0,
            animationComplete: false,
            createdAt: Date.now(),
          }

          await database.packOpeningSessions.add(created)
          return created
        },
      )

      session.value = opening
      isLoaded.value = true
      return opening
    } finally {
      isStarting.value = false
    }
  }

  // Сохраняет завершение упаковочной анимации отдельно от показа карточек.
  const markAnimationComplete = async (): Promise<void> => {
    if (!session.value || session.value.animationComplete) return
    await database.packOpeningSessions.update('pending', { animationComplete: true })
    session.value = { ...session.value, animationComplete: true }
  }

  // Атомарно выдаёт весь заранее рассчитанный результат и только затем списывает пак.
  const finalize = async (): Promise<void> => {
    await database.transaction(
      'rw',
      database.inventory,
      database.cards,
      database.duplicates,
      database.packOpeningSessions,
      async (): Promise<void> => {
        const pending: PackOpeningSession | undefined =
          await database.packOpeningSessions.get('pending')
        if (!pending) return

        for (const reward of pending.rewards) {
          const instance: StickerInstance = {
            id: reward.instanceId,
            playerId: reward.playerId,
            quality: 100,
            location: 'inventory',
          }
          const existing: StickerInstance | undefined = await database.cards
            .where('playerId')
            .equals(reward.playerId)
            .filter(({ location }: StickerInstance): boolean => location !== 'deleted')
            .first()

          if (existing) {
            await database.duplicates.add({ ...instance, location: 'duplicate' })
          } else {
            await database.cards.add(instance)
          }
        }

        await database.inventory.delete(pending.packId)
        await database.packOpeningSessions.delete('pending')
      },
    )
  }

  // Фиксирует просмотр карточки; последняя карточка завершает всю транзакцию открытия.
  const advance = async (): Promise<AdvancePackOpeningResult> => {
    if (!session.value || isAdvancing.value) return 'unavailable'
    isAdvancing.value = true

    try {
      const nextIndex: number = session.value.currentIndex + 1
      if (nextIndex < session.value.rewards.length) {
        await database.packOpeningSessions.update('pending', { currentIndex: nextIndex })
        session.value = { ...session.value, currentIndex: nextIndex }
        return 'advanced'
      }

      await finalize()
      session.value = { ...session.value, currentIndex: session.value.rewards.length }
      return 'completed'
    } finally {
      isAdvancing.value = false
    }
  }

  return {
    session,
    isLoaded,
    isStarting,
    isAdvancing,
    load,
    start,
    markAnimationComplete,
    advance,
  }
})
