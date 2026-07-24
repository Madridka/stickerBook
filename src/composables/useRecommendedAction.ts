import { computed, type ComputedRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { DUPLICATE_EXCHANGE_CONFIG, PACK_PRICE } from '@/data/mainConst'
import { useCollectionStore } from '@/stores/collection'
import { useGameGuideStore, type GuideStepDefinition } from '@/stores/gameGuide'
import { useInventoryStore } from '@/stores/inventory'
import { usePackHuntStore } from '@/stores/packHunt'
import { usePackOpeningStore } from '@/stores/packOpening'
import { usePlayerStore } from '@/stores/player'

export interface ActionProgress {
  current: number
  target: number
}

export interface RecommendedAction {
  id: string
  titleKey: string
  descriptionKey: string
  descriptionParams?: Record<string, string | number>
  priority: number
  progress?: ActionProgress
  action: {
    labelKey: string
    route: RouteLocationRaw
  }
}

export interface QuickAction {
  id: string
  titleKey: string
  descriptionKey?: string
  badge?: number | string
  route: RouteLocationRaw
  priority: number
  requiresEnergy: boolean
}

export interface RecommendedActionSnapshot {
  coins: number
  energy: number
  packCount: number
  hasPendingOpening: boolean
  cardsToPrepare: number
  preparedStickers: number
  duplicateCount: number
  hasPendingExchange: boolean
  canPlayMiniGame: boolean
  collectionCount: number
  albumCount: number
  guideStep?: GuideStepDefinition
}

const createAction = (
  id: string,
  title: string,
  description: string,
  label: string,
  route: RouteLocationRaw,
  priority: number,
  progress?: ActionProgress,
  descriptionParams?: Record<string, string | number>,
): RecommendedAction => ({
  id,
  titleKey: title,
  descriptionKey: description,
  priority,
  progress,
  descriptionParams,
  action: { labelKey: label, route },
})

// Чистый resolver: одинаковый снимок игрового состояния всегда даёт одинаковую рекомендацию.
export const resolveRecommendedAction = (
  state: RecommendedActionSnapshot,
): RecommendedAction => {
  if (state.hasPendingOpening) {
    return createAction(
      'continue-opening',
      'home.actions.continueOpening.title',
      'home.actions.continueOpening.description',
      'home.actions.continueOpening.action',
      { name: 'pack-opening' },
      1_100,
    )
  }
  const isBlockedEarnStep: boolean =
    state.guideStep?.id === 'earn-first-pack' && state.energy <= 0
  if (state.guideStep && !isBlockedEarnStep) {
    return createAction(
      `guide-${state.guideStep.id}`,
      state.guideStep.titleKey,
      state.guideStep.descriptionKey,
      state.guideStep.actionLabelKey,
      state.guideStep.route,
      1_000,
      state.guideStep.progress,
      state.guideStep.descriptionParams,
    )
  }
  if (state.preparedStickers > 0) {
    return createAction(
      'place-sticker',
      'home.actions.place.title',
      'home.actions.place.description',
      'home.actions.place.action',
      { name: 'album-wc-26' },
      800,
    )
  }
  if (state.packCount > 0) {
    return createAction(
      'open-pack',
      'home.actions.openPack.title',
      'home.actions.openPack.description',
      'home.actions.openPack.action',
      { name: 'pack-opening' },
      700,
    )
  }
  if (state.coins >= PACK_PRICE) {
    return createAction(
      'buy-pack',
      'home.actions.buy.title',
      'home.actions.buy.description',
      'home.actions.buy.action',
      { name: 'shop' },
      600,
    )
  }
  if (state.canPlayMiniGame) {
    return createAction(
      'play-mini-game',
      'home.actions.minigame.title',
      'home.actions.minigame.description',
      'home.actions.minigame.action',
      { name: 'pack-hunt', query: { game: 'signal' } },
      500,
    )
  }
  if (state.hasPendingExchange || state.duplicateCount >= DUPLICATE_EXCHANGE_CONFIG.tradeInCount) {
    return createAction(
      'exchange-duplicates',
      'home.actions.exchange.title',
      'home.actions.exchange.description',
      'home.actions.exchange.action',
      { name: 'collection', query: { tab: 'duplicates' } },
      400,
    )
  }
  if (state.energy > 0) {
    return createAction(
      'earn-coins',
      'home.actions.earn.title',
      'home.actions.earn.description',
      'home.actions.earn.action',
      { name: 'home', hash: '#clicker' },
      300,
      { current: Math.min(state.coins, PACK_PRICE), target: PACK_PRICE },
    )
  }
  if (state.cardsToPrepare > 0) {
    return createAction(
      'prepare-sticker',
      'home.actions.prepare.title',
      'home.actions.prepare.description',
      'home.actions.prepare.action',
      { name: 'collection', query: { filter: 'ready' } },
      200,
    )
  }
  return createAction(
    'browse-collection',
    state.collectionCount > 0
      ? 'home.actions.browse.title'
      : 'home.actions.browseAlbum.title',
    state.collectionCount > 0
      ? 'home.actions.browse.description'
      : 'home.actions.browseAlbum.description',
    state.collectionCount > 0
      ? 'home.actions.browse.action'
      : 'home.actions.browseAlbum.action',
    { name: state.collectionCount > 0 ? 'collection' : 'album' },
    100,
  )
}

export const resolveQuickActions = (state: RecommendedActionSnapshot): QuickAction[] => {
  const actions: QuickAction[] = []
  if (state.hasPendingOpening || state.packCount > 0) {
    actions.push({
      id: 'open-pack',
      titleKey: state.hasPendingOpening
        ? 'home.quick.continueOpening'
        : 'home.quick.openPack',
      badge: state.packCount || '…',
      route: { name: 'pack-opening' },
      priority: 900,
      requiresEnergy: false,
    })
  }
  if (state.preparedStickers > 0) {
    actions.push({
      id: 'place-stickers',
      titleKey: 'home.quick.place',
      badge: state.preparedStickers,
      route: { name: 'album-wc-26' },
      priority: 800,
      requiresEnergy: false,
    })
  }
  if (state.cardsToPrepare > 0) {
    actions.push({
      id: 'prepare-stickers',
      titleKey: 'home.quick.prepare',
      badge: state.cardsToPrepare,
      route: { name: 'collection', query: { filter: 'ready' } },
      priority: 700,
      requiresEnergy: false,
    })
  }
  if (state.canPlayMiniGame) {
    actions.push({
      id: 'mini-game',
      titleKey: 'home.quick.minigame',
      descriptionKey: 'home.quick.minigameAvailable',
      route: { name: 'pack-hunt', query: { game: 'signal' } },
      priority: 600,
      requiresEnergy: false,
    })
  }
  if (state.hasPendingExchange || state.duplicateCount >= DUPLICATE_EXCHANGE_CONFIG.tradeInCount) {
    actions.push({
      id: 'exchange',
      titleKey: 'home.quick.exchange',
      badge: state.duplicateCount,
      route: { name: 'collection', query: { tab: 'duplicates' } },
      priority: 500,
      requiresEnergy: false,
    })
  }
  if (state.collectionCount > state.albumCount) {
    actions.push({
      id: 'album-slots',
      titleKey: 'home.quick.album',
      descriptionKey: 'home.quick.albumProgress',
      route: { name: 'album-wc-26' },
      priority: 300,
      requiresEnergy: false,
    })
  }
  return actions.sort(
    (left: QuickAction, right: QuickAction): number => right.priority - left.priority,
  )
}

export interface RecommendedActions {
  recommendation: ComputedRef<RecommendedAction>
  quickActions: ComputedRef<QuickAction[]>
  snapshot: ComputedRef<RecommendedActionSnapshot>
}

export const useRecommendedAction = (): RecommendedActions => {
  const player = usePlayerStore()
  const inventory = useInventoryStore()
  const collection = useCollectionStore()
  const packOpening = usePackOpeningStore()
  const packHunt = usePackHuntStore()
  const guide = useGameGuideStore()

  const snapshot: ComputedRef<RecommendedActionSnapshot> = computed(() => {
    const placeable = collection.items.filter(({ instance }): boolean =>
      ['inventory', 'collection'].includes(instance.location),
    )
    const openingSession = packOpening.session
    return {
      coins: player.coins,
      energy: player.availableEnergy,
      packCount: inventory.packCount,
      hasPendingOpening: Boolean(
        openingSession && openingSession.currentIndex < openingSession.rewards.length,
      ),
      cardsToPrepare: placeable.filter(({ instance }): boolean => !instance.preparation).length,
      preparedStickers: placeable.filter(({ instance }): boolean =>
        Boolean(instance.preparation),
      ).length,
      duplicateCount: collection.duplicateTotal,
      hasPendingExchange: Boolean(collection.pendingExchange),
      canPlayMiniGame: packHunt.canPlay,
      collectionCount: collection.items.length,
      albumCount: collection.items.filter(
        ({ instance }): boolean => instance.location === 'album',
      ).length,
      guideStep: guide.currentStep,
    }
  })

  return {
    snapshot,
    recommendation: computed((): RecommendedAction =>
      resolveRecommendedAction(snapshot.value),
    ),
    quickActions: computed((): QuickAction[] => resolveQuickActions(snapshot.value)),
  }
}
