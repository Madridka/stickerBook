import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import {
  database,
  type InventoryItem,
  type PackOpeningReward,
  type PackOpeningSession,
} from '@/db/database'
import {
  getPlayerAlbumById,
  getPlayerAlbumCard,
  getPlayerBlisterById,
} from '@/data/albumRegistry'
import { BLISTER_CONFIGS, DROP_ENGINE_CONFIG } from '@/config/gameBalance'
import type { CardDefinition, StickerInstance } from '@/types'
import { createId } from '@/utils/createId'
import { selectCardV2 } from '@/utils/dropEngine'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'
import {
  notifyDailyTasksChanged,
  recordDailyTaskEventsInTransaction,
} from '@/features/dailyTasks/dailyTaskService'

export type AdvancePackOpeningResult = 'advanced' | 'completed' | 'unavailable'

const resolvePlayerBlister = (blisterId: string) =>
  getPlayerBlisterById(blisterId === 'rare' ? 'standard' : blisterId)

const isPlayerPack = (item: InventoryItem): boolean => {
  if (item.type !== 'pack') return false
  const blister = resolvePlayerBlister(item.packId ?? BLISTER_CONFIGS.standard.id)
  const albumId: string = item.albumId ?? blister?.albumId ?? BLISTER_CONFIGS.standard.albumId
  return Boolean(blister && blister.albumIds.includes(albumId))
}

const isPlayerSession = (candidate?: PackOpeningSession): candidate is PackOpeningSession => {
  if (!candidate) return false
  const blister = resolvePlayerBlister(candidate.blisterId)
  return Boolean(
    blister &&
      getPlayerAlbumById(candidate.albumId) &&
      candidate.rewards.every(
        ({ albumId, playerId }): boolean =>
          blister.albumIds.includes(albumId) && Boolean(getPlayerAlbumCard(albumId, playerId)),
      ),
  )
}

export const usePackOpeningStore = defineStore('packOpening', () => {
  const session: Ref<PackOpeningSession | undefined> = ref(undefined)
  const isLoaded: Ref<boolean> = ref(false)
  const isStarting: Ref<boolean> = ref(false)
  const isAdvancing: Ref<boolean> = ref(false)

  // Загружает сохранённый прогресс, чтобы продолжить показ с той же карточки.
  const load = async (): Promise<PackOpeningSession | undefined> => {
    const stored: PackOpeningSession | undefined =
      await database.packOpeningSessions.get('pending')
    session.value = isPlayerSession(stored) ? stored : undefined
    isLoaded.value = true
    return session.value
  }

  // Один раз рассчитывает содержимое пака и резервирует его сохраняемой сессией.
  const start = async (requestedPackId?: string): Promise<PackOpeningSession | undefined> => {
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
          if (isPlayerSession(pending)) return pending
          if (pending) await database.packOpeningSessions.delete('pending')

          const pack: InventoryItem | undefined = requestedPackId
            ? await database.inventory.get(requestedPackId)
            : await database.inventory
                .orderBy('createdAt')
                .filter(isPlayerPack)
                .first()
          if (!pack || !isPlayerPack(pack)) return undefined
          const blisterId: string = pack.packId ?? BLISTER_CONFIGS.standard.id
          const blister = resolvePlayerBlister(blisterId)
          const albums = (blister?.albumIds ?? [])
            .map((albumId) => getPlayerAlbumById(albumId))
            .filter((album) => album !== undefined)
          if (!blister || albums.length !== blister.albumIds.length) return undefined

          const albumIds: Set<string> = new Set(blister.albumIds)
          const activeCards: StickerInstance[] = (await database.cards.toArray()).filter(
            ({ albumId, location }: StickerInstance): boolean =>
              albumIds.has(albumId) && location !== 'deleted',
          )
          const ownedPlayerIds: Set<string> = new Set(
            activeCards.map(
              ({ albumId, playerId }: StickerInstance): string => `${albumId}:${playerId}`,
            ),
          )
          const rewards: PackOpeningReward[] = Array.from(
            { length: blister.cardCount },
            (): PackOpeningReward => {
              const card: CardDefinition = selectCardV2({
                catalogs: albums.flatMap(({ catalogs }) => catalogs),
                packConfig: {
                  cardsPerPack: blister.cardCount,
                  rarityOdds: blister.rarityOdds,
                },
                poolId: blister.poolId,
                defaultSelectionWeight: DROP_ENGINE_CONFIG.defaultSelectionWeight,
                randomSource: Math.random,
              }) as CardDefinition
              const cardKey: string = `${card.albumId}:${card.id}`
              const isDuplicate: boolean = ownedPlayerIds.has(cardKey)
              ownedPlayerIds.add(cardKey)
              return {
                instanceId: createId(),
                albumId: card.albumId,
                playerId: card.id,
                isDuplicate,
              }
            },
          )
          const created: PackOpeningSession = {
            id: 'pending',
            packId: pack.id,
            blisterId,
            albumId: rewards[0]?.albumId ?? blister.albumId,
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
  const finalize = async (): Promise<boolean> =>
    database.transaction(
      'rw',
      [
        database.inventory,
        database.cards,
        database.duplicates,
        database.packOpeningSessions,
        database.goalCounters,
        database.dailyTasks,
      ],
      async (): Promise<boolean> => {
        const pending: PackOpeningSession | undefined =
          await database.packOpeningSessions.get('pending')
        if (!isPlayerSession(pending)) return false

        for (const reward of pending.rewards) {
          const instance: StickerInstance = {
            id: reward.instanceId,
            albumId: reward.albumId,
            playerId: reward.playerId,
            quality: 100,
            location: 'inventory',
          }
          const existing: StickerInstance | undefined = await database.cards
            .where('[albumId+playerId]')
            .equals([reward.albumId, reward.playerId])
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
        const counter = await database.goalCounters.get('packs-opened')
        await database.goalCounters.put({
          id: 'packs-opened',
          value: (counter?.value ?? 0) + 1,
          updatedAt: Date.now(),
        })
        await recordDailyTaskEventsInTransaction([
          { type: 'packs-opened', amount: 1 },
          { type: 'cards-received', amount: pending.rewards.length },
        ])
        return true
      },
    )

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

      const completed = await finalize()
      if (completed) {
        notifyGoalsChanged()
        notifyDailyTasksChanged()
      }
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
