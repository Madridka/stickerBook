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
import { storeCardInstance } from '@/db/stickerLifecycle'
import {
  getAlbumPityContext,
  logPityApplied,
  logPityNaturalSuccess,
  logPityProtectionArmed,
  registerEligiblePackOutcome,
} from '@/features/pity/albumPityService'
import {
  createPityPackRewards,
  isPityPackTypeEligible,
  shouldProtectPack,
} from '@/features/pity/pityDomain'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'
import {
  notifyDailyTasksChanged,
  recordDailyTaskEventsInTransaction,
} from '@/features/dailyTasks/dailyTaskService'

export type AdvancePackOpeningResult = 'advanced' | 'completed' | 'unavailable'

const resolvePlayerBlister = (blisterId: string) =>
  getPlayerBlisterById(blisterId)

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
        database.albumPityStates,
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
          const isPityEligiblePack: boolean = isPityPackTypeEligible(
            blister.albumIds,
            blister.pityEligible,
          )
          const pityAlbum = isPityEligiblePack ? albums[0] : undefined
          const collectedPlayerIds: Set<string> = new Set(
            pityAlbum
              ? activeCards
                  .filter(
                    ({ albumId, playerId }): boolean =>
                      albumId === pityAlbum.id &&
                      pityAlbum.cards.some(({ id }): boolean => id === playerId),
                  )
                  .map(({ playerId }): string => playerId)
              : [],
          )
          const pityContext = pityAlbum
            ? await getAlbumPityContext(
                pityAlbum.id,
                collectedPlayerIds.size,
                pityAlbum.cards.length,
              )
            : { eligible: false, dryPackCount: 0 }
          const protectionArmed: boolean =
            pityContext.eligible && shouldProtectPack(pityContext.dryPackCount)
          if (pityAlbum && protectionArmed) logPityProtectionArmed(pityAlbum.id)

          let pityApplied = false
          let rewards: PackOpeningReward[]
          if (pityAlbum) {
            const generated = createPityPackRewards({
              albumId: pityAlbum.id,
              catalogs: pityAlbum.catalogs,
              cardCount: blister.cardCount,
              poolId: blister.poolId,
              rarityOdds: blister.rarityOdds,
              defaultSelectionWeight: DROP_ENGINE_CONFIG.defaultSelectionWeight,
              ownedPlayerIds: collectedPlayerIds,
              protectionArmed,
              randomSource: Math.random,
              createInstanceId: createId,
            })
            rewards = generated.rewards
            pityApplied = generated.pityApplied
            if (pityContext.eligible) {
              await registerEligiblePackOutcome(pityAlbum.id, generated.hasNewCard)
            }
            if (protectionArmed && generated.hasNewCard && !generated.pityApplied) {
              logPityNaturalSuccess(pityAlbum.id)
            }
            if (generated.pityApplied) logPityApplied(pityAlbum.id)
          } else {
            rewards = Array.from({ length: blister.cardCount }, (): PackOpeningReward => {
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
            })
          }
          const created: PackOpeningSession = {
            id: 'pending',
            packId: pack.id,
            blisterId,
            albumId: rewards[0]?.albumId ?? blister.albumId,
            rewards,
            currentIndex: 0,
            animationComplete: false,
            createdAt: Date.now(),
            pityEligible: pityContext.eligible,
            pityApplied,
            pityDryPackCountBefore: pityContext.eligible
              ? pityContext.dryPackCount
              : undefined,
            pityOutcomeRecorded: pityContext.eligible,
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
        database.albumPityStates,
      ],
      async (): Promise<boolean> => {
        const pending: PackOpeningSession | undefined =
          await database.packOpeningSessions.get('pending')
        if (!isPlayerSession(pending)) return false

        const newAlbumIds: Set<string> = new Set()
        for (const reward of pending.rewards) {
          const stored: StickerInstance = await storeCardInstance(
            reward.albumId,
            reward.playerId,
            reward.instanceId,
          )
          if (stored.location !== 'duplicate') newAlbumIds.add(reward.albumId)
        }
        // Сессии, созданные до переноса учёта pity в start(), завершаем по старой схеме один раз.
        if (pending.pityEligible && !pending.pityOutcomeRecorded) {
          await registerEligiblePackOutcome(
            pending.albumId,
            newAlbumIds.has(pending.albumId),
          )
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
