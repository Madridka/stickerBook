import { computed, type ComputedRef } from 'vue'
import { useCollectionStore } from '@/stores/collection'

export interface CollectionProgress {
  collection: ReturnType<typeof useCollectionStore>
  foundLabel: ComputedRef<string>
}

export const useCollectionProgress = (): CollectionProgress => {
  // Подключает состояние коллекции к компоненту
  const collection: ReturnType<typeof useCollectionStore> = useCollectionStore()

  // Формирует компактную подпись прогресса для интерфейса
  const foundLabel: ComputedRef<string> = computed(
    (): string => `${collection.collectedTotal} / ${collection.total}`,
  )

  return { collection, foundLabel }
}
