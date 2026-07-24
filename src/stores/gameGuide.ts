import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { RouteLocationRaw } from 'vue-router'
import { database, type GameGuideProgress } from '@/db/database'
import { PACK_PRICE } from '@/data/mainConst'
import { useCollectionStore } from '@/stores/collection'
import { useInventoryStore } from '@/stores/inventory'
import { usePackHuntStore } from '@/stores/packHunt'
import { usePackOpeningStore } from '@/stores/packOpening'
import { usePlayerStore } from '@/stores/player'

export type GuideStepId =
  | 'earn-first-pack'
  | 'buy-first-pack'
  | 'open-first-pack'
  | 'view-first-collection'
  | 'prepare-first-sticker'
  | 'place-first-sticker'
  | 'complete-first-minigame'

export interface GuideStepDefinition {
  id: GuideStepId
  titleKey: string
  descriptionKey: string
  descriptionParams?: Record<string, string | number>
  actionLabelKey: string
  route: RouteLocationRaw
  progress?: { current: number; target: number }
}

const GUIDE_PROGRESS_ID: GameGuideProgress['id'] = 'first-steps'
const STEP_ORDER: GuideStepId[] = [
  'earn-first-pack',
  'buy-first-pack',
  'open-first-pack',
  'view-first-collection',
  'prepare-first-sticker',
  'place-first-sticker',
  'complete-first-minigame',
]

export const useGameGuideStore = defineStore('gameGuide', () => {
  const player = usePlayerStore()
  const inventory = useInventoryStore()
  const collection = useCollectionStore()
  const packOpening = usePackOpeningStore()
  const packHunt = usePackHuntStore()
  const completedStepIds: Ref<GuideStepId[]> = ref([])
  const viewedCollection: Ref<boolean> = ref(false)
  const isLoaded: Ref<boolean> = ref(false)
  let saveQueue: Promise<void> = Promise.resolve()
  let initializationPromise: Promise<void>

  const hasCards: ComputedRef<boolean> = computed((): boolean => collection.items.length > 0)
  const hasPreparedSticker: ComputedRef<boolean> = computed((): boolean =>
    collection.items.some(
      ({ instance }): boolean =>
        Boolean(instance.preparation) && ['inventory', 'collection'].includes(instance.location),
    ),
  )
  const hasPlacedSticker: ComputedRef<boolean> = computed((): boolean =>
    collection.items.some(({ instance }): boolean => instance.location === 'album'),
  )

  const save = (): void => {
    if (!isLoaded.value) return
    const progress: GameGuideProgress = {
      id: GUIDE_PROGRESS_ID,
      completedStepIds: [...completedStepIds.value],
      viewedCollection: viewedCollection.value,
      completed: completedStepIds.value.length === STEP_ORDER.length,
      updatedAt: Date.now(),
    }
    saveQueue = saveQueue.then(async (): Promise<void> => {
      await database.gameGuideProgress.put(progress)
    })
  }

  // Выводит пройденные шаги из реального игрового состояния, включая прогресс до миграции.
  const reconcile = (): void => {
    if (!isLoaded.value) return
    const completed: Set<GuideStepId> = new Set(completedStepIds.value)
    const hasUnfinishedOpening: boolean = Boolean(
      packOpening.session &&
        packOpening.session.currentIndex < packOpening.session.rewards.length,
    )
    const downstreamPackProgress: boolean =
      inventory.packCount > 0 || hasUnfinishedOpening || hasCards.value

    if (player.coins >= PACK_PRICE || downstreamPackProgress) completed.add('earn-first-pack')
    if (downstreamPackProgress) completed.add('buy-first-pack')
    if (hasCards.value) completed.add('open-first-pack')
    if (viewedCollection.value) completed.add('view-first-collection')
    if (hasPreparedSticker.value || hasPlacedSticker.value) {
      completed.add('view-first-collection')
      completed.add('prepare-first-sticker')
    }
    if (hasPlacedSticker.value) completed.add('place-first-sticker')
    if (packHunt.lastClaimedAt > 0) completed.add('complete-first-minigame')

    const next: GuideStepId[] = STEP_ORDER.filter((step: GuideStepId): boolean =>
      completed.has(step),
    )
    if (next.join('|') !== completedStepIds.value.join('|')) {
      completedStepIds.value = next
      save()
    }
  }

  const load = async (): Promise<void> => {
    const saved: GameGuideProgress | undefined =
      await database.gameGuideProgress.get(GUIDE_PROGRESS_ID)
    completedStepIds.value = (saved?.completedStepIds ?? []).filter(
      (step: string): step is GuideStepId => STEP_ORDER.includes(step as GuideStepId),
    )
    // Для существующего сохранения наличие карточек означает, что экран результата уже был пройден.
    viewedCollection.value = saved?.viewedCollection ?? collection.items.length > 0
    isLoaded.value = true
    reconcile()
    save()
  }

  const markCollectionViewed = async (): Promise<void> => {
    await initializationPromise
    if (viewedCollection.value) return
    viewedCollection.value = true
    reconcile()
    save()
  }

  const currentStep: ComputedRef<GuideStepDefinition | undefined> = computed(() => {
    const next: GuideStepId | undefined = STEP_ORDER.find(
      (step: GuideStepId): boolean => !completedStepIds.value.includes(step),
    )
    if (!next) return undefined

    const definitions: Record<GuideStepId, GuideStepDefinition> = {
      'earn-first-pack': {
        id: next,
        titleKey: 'home.guide.earn.title',
        descriptionKey: 'home.guide.earn.description',
        descriptionParams: { remaining: Math.max(0, PACK_PRICE - player.coins) },
        actionLabelKey: 'home.guide.earn.action',
        route: { name: 'home', hash: '#clicker' },
        progress: { current: Math.min(player.coins, PACK_PRICE), target: PACK_PRICE },
      },
      'buy-first-pack': {
        id: next,
        titleKey: 'home.guide.buy.title',
        descriptionKey: 'home.guide.buy.description',
        actionLabelKey: 'home.guide.buy.action',
        route: { name: 'shop' },
      },
      'open-first-pack': {
        id: next,
        titleKey: 'home.guide.open.title',
        descriptionKey: 'home.guide.open.description',
        actionLabelKey: 'home.guide.open.action',
        route: { name: 'pack-opening' },
      },
      'view-first-collection': {
        id: next,
        titleKey: 'home.guide.view.title',
        descriptionKey: 'home.guide.view.description',
        actionLabelKey: 'home.guide.view.action',
        route: { name: 'collection' },
      },
      'prepare-first-sticker': {
        id: next,
        titleKey: 'home.guide.prepare.title',
        descriptionKey: 'home.guide.prepare.description',
        actionLabelKey: 'home.guide.prepare.action',
        route: { name: 'collection', query: { filter: 'ready' } },
      },
      'place-first-sticker': {
        id: next,
        titleKey: 'home.guide.place.title',
        descriptionKey: 'home.guide.place.description',
        actionLabelKey: 'home.guide.place.action',
        route: { name: 'album-wc-26' },
      },
      'complete-first-minigame': {
        id: next,
        titleKey: 'home.guide.minigame.title',
        descriptionKey: 'home.guide.minigame.description',
        actionLabelKey: 'home.guide.minigame.action',
        route: { name: 'pack-hunt', query: { game: 'signal' } },
      },
    }
    return definitions[next]
  })

  const isCompleted: ComputedRef<boolean> = computed(
    (): boolean => isLoaded.value && completedStepIds.value.length === STEP_ORDER.length,
  )

  watch(
    [
      () => player.coins,
      () => inventory.packCount,
      () => packOpening.session,
      () => collection.items,
      () => packHunt.lastClaimedAt,
    ],
    reconcile,
    { deep: true },
  )

  initializationPromise = Promise.all([
    inventory.load(),
    collection.load(),
    packOpening.load(),
    packHunt.load(),
  ]).then(load)

  return {
    completedStepIds,
    currentStep,
    isCompleted,
    isLoaded,
    markCollectionViewed,
    reconcile,
  }
})
