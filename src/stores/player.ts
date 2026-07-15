import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type PlayerState } from '@/db/database'

const PLAYER_ID = 'current'

export const usePlayerStore = defineStore('player', () => {
  const coins: Ref<number> = ref(0)
  const isLoaded: Ref<boolean> = ref(false)

  // Форматирует баланс для отображения в интерфейсе
  const formattedCoins: ComputedRef<string> = computed(() => coins.value.toLocaleString('ru-RU'))
  let hasLocalChanges: boolean = false
  let saveQueue: Promise<void> = Promise.resolve()

  // Загружает сохранённые очки до первого взаимодействия с экраном
  const load = async (): Promise<void> => {
    const savedPlayer: PlayerState | undefined = await database.player.get(PLAYER_ID)

    if (!hasLocalChanges && savedPlayer) coins.value = savedPlayer.coins
    isLoaded.value = true
  }

  // Последовательно записывает изменения, чтобы быстрые клики не перетирали друг друга
  const save = (): void => {
    saveQueue = saveQueue.then(async (): Promise<void> => {
      await database.player.put({ id: PLAYER_ID, coins: coins.value })
    })
  }

  // Начисляет одну монету за нажатие на логотип
  const addCoin = (): void => {
    hasLocalChanges = true
    coins.value += 1
    save()
  }

  // Сбрасывает баланс игрока и сохраняет новое значение
  const resetCoins = (): void => {
    hasLocalChanges = true
    coins.value = 0
    save()
  }

  // Проверяет баланс и списывает указанное количество coins
  const spendCoins = (amount: number): boolean => {
    if (amount <= 0 || coins.value < amount) return false

    hasLocalChanges = true
    coins.value -= amount
    save()
    return true
  }

  void load()

  return { coins, formattedCoins, isLoaded, addCoin, spendCoins, resetCoins }
})
