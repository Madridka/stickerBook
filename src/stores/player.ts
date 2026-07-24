import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, PLAYER_STATE_ID, type PlayerState } from '@/db/database'
import { CLICKER_CONFIG } from '@/data/mainConst'

const COIN_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: CLICKER_CONFIG.rewardPrecision,
})
const ENERGY_EPSILON = 0.000001

// Округляет начисления, чтобы дробный бонус не накапливал ошибки floating point.
const roundReward = (value: number): number => {
  const multiplier: number = 10 ** CLICKER_CONFIG.rewardPrecision
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

export const usePlayerStore = defineStore('player', () => {
  const coins: Ref<number> = ref(0)
  const energy: Ref<number> = ref(CLICKER_CONFIG.energyLimit)
  const energyUpdatedAt: Ref<number> = ref(Date.now())
  const isLoaded: Ref<boolean> = ref(false)

  // Форматирует баланс для отображения в интерфейсе
  const formattedCoins: ComputedRef<string> = computed((): string =>
    COIN_FORMATTER.format(coins.value),
  )
  const availableEnergy: ComputedRef<number> = computed((): number =>
    Math.min(
      CLICKER_CONFIG.energyLimit,
      Math.floor((energy.value + ENERGY_EPSILON) / CLICKER_CONFIG.energyCostPerClick),
    ),
  )
  const energyPercent: ComputedRef<number> = computed(
    (): number => (energy.value / CLICKER_CONFIG.energyLimit) * 100,
  )
  const canClick: ComputedRef<boolean> = computed(
    (): boolean => energy.value + ENERGY_EPSILON >= CLICKER_CONFIG.energyCostPerClick,
  )
  const millisecondsUntilNextEnergy: ComputedRef<number> = computed((): number => {
    if (energy.value >= CLICKER_CONFIG.energyLimit) return 0

    const fractionalEnergy: number = energy.value % CLICKER_CONFIG.energyCostPerClick
    const missingEnergy: number =
      fractionalEnergy <= ENERGY_EPSILON
        ? CLICKER_CONFIG.energyCostPerClick
        : CLICKER_CONFIG.energyCostPerClick - fractionalEnergy
    const energyPerMillisecond: number =
      CLICKER_CONFIG.energyLimit / CLICKER_CONFIG.fullRechargeMs
    return Math.ceil(missingEnergy / energyPerMillisecond)
  })
  const millisecondsUntilFullEnergy: ComputedRef<number> = computed((): number => {
    if (energy.value >= CLICKER_CONFIG.energyLimit) return 0
    const energyPerMillisecond: number =
      CLICKER_CONFIG.energyLimit / CLICKER_CONFIG.fullRechargeMs
    return Math.ceil((CLICKER_CONFIG.energyLimit - energy.value) / energyPerMillisecond)
  })
  let hasLocalChanges: boolean = false
  let saveQueue: Promise<void> = Promise.resolve()

  // Восстанавливает энергию пропорционально времени, прошедшему в онлайне или офлайн.
  const refreshEnergy = (now: number = Date.now()): void => {
    const safeNow: number = Math.max(now, energyUpdatedAt.value)
    const elapsedMs: number = safeNow - energyUpdatedAt.value
    const regeneratedEnergy: number =
      (elapsedMs / CLICKER_CONFIG.fullRechargeMs) * CLICKER_CONFIG.energyLimit

    energy.value = Math.min(CLICKER_CONFIG.energyLimit, energy.value + regeneratedEnergy)
    energyUpdatedAt.value = safeNow
  }

  // Загружает сохранённые очки и энергию до первого взаимодействия с экраном.
  const load = async (): Promise<void> => {
    const savedPlayer: PlayerState | undefined = await database.player.get(PLAYER_STATE_ID)

    if (!hasLocalChanges && savedPlayer) {
      coins.value = savedPlayer.coins
      energy.value = savedPlayer.energy ?? CLICKER_CONFIG.energyLimit
      energyUpdatedAt.value = savedPlayer.energyUpdatedAt ?? Date.now()
      refreshEnergy()
    }
    isLoaded.value = true
  }

  // Последовательно записывает изменения, чтобы быстрые клики не перетирали друг друга
  const save = (): void => {
    saveQueue = saveQueue.then(async (): Promise<void> => {
      await database.player.put({
        id: PLAYER_STATE_ID,
        coins: coins.value,
        energy: energy.value,
        energyUpdatedAt: energyUpdatedAt.value,
      })
    })
  }

  // Ожидает все более ранние начисления перед внешней экономической транзакцией.
  const flushSaves = async (): Promise<void> => {
    await saveQueue
  }

  // Синхронизирует Pinia с состоянием, уже зафиксированным экономическим сервисом.
  const applyPersistedState = (player: PlayerState): void => {
    hasLocalChanges = false
    coins.value = player.coins
    energy.value = player.energy
    energyUpdatedAt.value = player.energyUpdatedAt
    isLoaded.value = true
  }

  // Расходует фиксированную энергию и начисляет награду, не меняя размер запаса из-за бонуса.
  const addCoin = (amount: number = CLICKER_CONFIG.baseReward): boolean => {
    if (!Number.isFinite(amount) || amount <= 0) return false

    refreshEnergy()
    if (!canClick.value) return false

    hasLocalChanges = true
    energy.value = Math.max(0, energy.value - CLICKER_CONFIG.energyCostPerClick)
    coins.value = roundReward(coins.value + amount)
    save()
    return true
  }

  // Сбрасывает баланс игрока и сохраняет новое значение
  const resetCoins = (): void => {
    hasLocalChanges = true
    coins.value = 0
    save()
  }

  void load()

  return {
    coins,
    energy,
    energyLimit: CLICKER_CONFIG.energyLimit,
    availableEnergy,
    energyPercent,
    millisecondsUntilNextEnergy,
    millisecondsUntilFullEnergy,
    canClick,
    formattedCoins,
    isLoaded,
    addCoin,
    applyPersistedState,
    flushSaves,
    refreshEnergy,
    resetCoins,
  }
})
