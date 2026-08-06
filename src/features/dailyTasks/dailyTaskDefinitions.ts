import type {
  DailyTaskDefinition,
  DailyTaskGroup,
  DailyTaskId,
} from './types'

// Варианты разделены по группам: каждый день выбирается по одному заданию из каждой.
export const dailyTaskDefinitions: readonly DailyTaskDefinition[] = [
  {
    id: 'logo-clicks-30',
    group: 'activity',
    event: 'coins-earned',
    target: 30,
    titleKey: 'dailyTasks.tasks.logoClicks30',
    icon: 'pi pi-bolt',
    route: { name: 'home', hash: '#goal-clicker' },
  },
  {
    id: 'logo-clicks-50',
    group: 'activity',
    event: 'coins-earned',
    target: 50,
    titleKey: 'dailyTasks.tasks.logoClicks50',
    icon: 'pi pi-bolt',
    route: { name: 'home', hash: '#goal-clicker' },
  },
  {
    id: 'earn-coins-35',
    group: 'activity',
    event: 'coins-earned',
    target: 35,
    titleKey: 'dailyTasks.tasks.earnCoins35',
    icon: 'pi pi-wallet',
    route: { name: 'home', hash: '#goal-clicker' },
  },
  {
    id: 'restore-energy-15',
    group: 'activity',
    event: 'energy-restored',
    target: 15,
    titleKey: 'dailyTasks.tasks.restoreEnergy15',
    icon: 'pi pi-sync',
    route: { name: 'home', hash: '#goal-clicker' },
  },
  {
    id: 'spend-coins-20',
    group: 'economy',
    event: 'coins-spent',
    target: 20,
    titleKey: 'dailyTasks.tasks.spendCoins20',
    icon: 'pi pi-shopping-bag',
    route: { name: 'shop' },
  },
  {
    id: 'spend-coins-40',
    group: 'economy',
    event: 'coins-spent',
    target: 40,
    titleKey: 'dailyTasks.tasks.spendCoins40',
    icon: 'pi pi-shopping-bag',
    route: { name: 'shop' },
  },
  {
    id: 'purchase-pack-1',
    group: 'economy',
    event: 'packs-purchased',
    target: 1,
    titleKey: 'dailyTasks.tasks.purchasePack1',
    icon: 'pi pi-shopping-cart',
    route: { name: 'shop' },
  },
  {
    id: 'open-pack-1',
    group: 'economy',
    event: 'packs-opened',
    target: 1,
    titleKey: 'dailyTasks.tasks.openPack1',
    icon: 'pi pi-box',
    route: { name: 'shop' },
  },
  {
    id: 'open-packs-2',
    group: 'economy',
    event: 'packs-opened',
    target: 2,
    titleKey: 'dailyTasks.tasks.openPacks2',
    icon: 'pi pi-box',
    route: { name: 'shop' },
  },
  {
    id: 'receive-cards-5',
    group: 'collection',
    event: 'cards-received',
    target: 5,
    titleKey: 'dailyTasks.tasks.receiveCards5',
    icon: 'pi pi-images',
    route: { name: 'shop' },
  },
  {
    id: 'receive-cards-10',
    group: 'collection',
    event: 'cards-received',
    target: 10,
    titleKey: 'dailyTasks.tasks.receiveCards10',
    icon: 'pi pi-images',
    route: { name: 'shop' },
  },
  {
    id: 'place-cards-2',
    group: 'collection',
    event: 'cards-placed',
    target: 2,
    titleKey: 'dailyTasks.tasks.placeCards2',
    icon: 'pi pi-book',
    route: { name: 'collection', query: { filter: 'ready' } },
  },
  {
    id: 'place-cards-4',
    group: 'collection',
    event: 'cards-placed',
    target: 4,
    titleKey: 'dailyTasks.tasks.placeCards4',
    icon: 'pi pi-book',
    route: { name: 'collection', query: { filter: 'ready' } },
  },
] as const

export const dailyTaskDefinitionById: ReadonlyMap<DailyTaskId, DailyTaskDefinition> =
  new Map(
    dailyTaskDefinitions.map(
      (definition): [DailyTaskId, DailyTaskDefinition] => [definition.id, definition],
    ),
  )

export const DAILY_TASK_GROUPS: readonly DailyTaskGroup[] = [
  'activity',
  'economy',
  'collection',
]
