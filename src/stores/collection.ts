import { defineStore } from 'pinia'
import collectionData from '../data/collection.json'

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    collected: [] as string[],
    total: collectionData.total,
  }),
  getters: {
    progress: (state) => Math.round((state.collected.length / state.total) * 100),
  },
})
