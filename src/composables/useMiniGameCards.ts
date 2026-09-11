import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue'
import type { PlayerCardDefinition } from '@/types'
import { loadMiniGamePlayers } from '@/utils/miniGameCards'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'

interface MiniGameCardsState {
  cards: Ref<PlayerCardDefinition[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  attempt: Ref<number>
  reload: () => Promise<void>
  imageLoaded: (id: string) => void
  imageFailed: () => void
}

// Таймер игры стартует только по load всех показанных изображений. Ошибка позволяет повторить загрузку.
export const useMiniGameCards = (select: (pool: readonly PlayerCardDefinition[]) => PlayerCardDefinition[]): MiniGameCardsState => {
  const cards = shallowRef<PlayerCardDefinition[]>([])
  const loading = ref(true)
  const error = ref(false)
  const attempt = ref(0)
  const loaded = ref<Set<string>>(new Set())
  let disposed = false
  let request = 0
  let timeout: ReturnType<typeof setTimeout> | undefined
  const reload = async (): Promise<void> => {
    const currentRequest = ++request
    loading.value = true
    error.value = false
    cards.value = []
    loaded.value = new Set()
    attempt.value += 1
    clearTimeout(timeout)
    timeout = setTimeout(() => { if (!disposed) { error.value = true; loading.value = false } }, PACK_HUNT_CONFIG.cardLoadTimeoutMs)
    try {
      const pool = await loadMiniGamePlayers()
      if (!disposed && currentRequest === request) cards.value = select(pool)
    } catch {
      if (disposed || currentRequest !== request) return
      clearTimeout(timeout)
      if (!disposed) { error.value = true; loading.value = false }
    }
  }
  const imageLoaded = (id: string): void => {
    loaded.value.add(id)
    if (cards.value.length && cards.value.every((card) => loaded.value.has(card.id))) { clearTimeout(timeout); loading.value = false }
  }
  const imageFailed = (): void => { clearTimeout(timeout); error.value = true; loading.value = false }
  onMounted(() => { void reload() })
  onBeforeUnmount(() => { disposed = true; clearTimeout(timeout) })
  return { cards, loading, error, attempt, reload, imageLoaded, imageFailed }
}
