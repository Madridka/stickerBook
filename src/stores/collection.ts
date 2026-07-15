import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import collectionData from '@/data/collection.json'

export const useCollectionStore = defineStore('collection', () => {
  const collected: Ref<string[]> = ref([])
  const total: number = collectionData.total
  const pages: number = collectionData.pages

  // Вычисляет процент найденных стикеров текущей коллекции
  const progress: ComputedRef<number> = computed((): number => Math.round((collected.value.length / total) * 100))

  return {
    collected,
    total,
    pages,
    progress,
  }
})
