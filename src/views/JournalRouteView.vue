<script setup lang="ts">
import { computed, defineAsyncComponent, watch, type ComputedRef, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getJournalById } from '@/features/journals/registry'
import type { JournalDefinition } from '@/features/journals/types'

const route = useRoute()
const router = useRouter()
const collectionJournalView: Component = defineAsyncComponent(() => import('@/views/AlbumView.vue'))
const historicalJournalView: Component = defineAsyncComponent(
  () => import('@/views/HistoricalJournalView.vue'),
)
const routeJournalId: ComputedRef<string> = computed(() => {
  const metaJournalId: unknown = route.meta.journalId
  if (typeof metaJournalId === 'string') return metaJournalId
  return typeof route.params.journalId === 'string' ? route.params.journalId : ''
})
const journal: ComputedRef<JournalDefinition | undefined> = computed(() =>
  getJournalById(routeJournalId.value),
)
const journalView: ComputedRef<Component | undefined> = computed(() => {
  if (journal.value?.type === 'collection') return collectionJournalView
  if (journal.value?.type === 'historical') return historicalJournalView
  return undefined
})

watch(
  journal,
  (currentJournal: JournalDefinition | undefined): void => {
    if (!currentJournal) void router.replace({ name: 'album' })
  },
  { immediate: true },
)
</script>

<template>
  <component :is="journalView" v-if="journalView" />
</template>
