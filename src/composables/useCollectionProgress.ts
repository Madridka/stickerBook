import { computed } from 'vue'
import { useCollectionStore } from '../stores/collection'

export const useCollectionProgress = () => {
  const collection = useCollectionStore()
  const foundLabel = computed(() => `${collection.collected.length} / ${collection.total}`)

  return { collection, foundLabel }
}
