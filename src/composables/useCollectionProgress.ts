import { computed, type ComputedRef } from 'vue'
import { useCollectionStore } from '@/stores/collection'

export interface CollectionProgress {
  collection: ReturnType<typeof useCollectionStore>
  foundLabel: ComputedRef<string>
}

export const useCollectionProgress = (): CollectionProgress => {
  const collection: ReturnType<typeof useCollectionStore> = useCollectionStore()
  const foundLabel: ComputedRef<string> = computed(
    (): string => `${collection.collected.length} / ${collection.total}`,
  )

  return { collection, foundLabel }
}
