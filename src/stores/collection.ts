import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type CollectedSticker } from '@/db/database'
import collectionData from '@/data/collection.json'

export const useCollectionStore = defineStore('collection', () => {
  const collected: Ref<string[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)

  // Загружает общие параметры коллекции из JSON-данных
  const total: number = collectionData.total
  const pages: number = collectionData.pages

  // Восстанавливает уже открытые карточки из локальной коллекции
  const load = async (): Promise<void> => {
    const stickers: CollectedSticker[] = await database.stickers.toArray()
    collected.value = stickers.map(({ stickerId }) => stickerId)
    isLoaded.value = true
  }

  // Добавляет карточку в коллекцию и не создаёт лишнюю запись при повторном выпадении
  const addSticker = async (stickerId: string): Promise<void> => {
    if (collected.value.includes(stickerId)) return

    const sticker: CollectedSticker = { id: crypto.randomUUID(), stickerId, collectedAt: Date.now() }
    await database.stickers.add(sticker)
    collected.value = [...collected.value, stickerId]
  }

  // Вычисляет процент найденных стикеров текущей коллекции
  const progress: ComputedRef<number> = computed((): number =>
    Math.round((collected.value.length / total) * 100),
  )

  void load()

  return {
    collected,
    isLoaded,
    total,
    pages,
    progress,
    addSticker,
  }
})
