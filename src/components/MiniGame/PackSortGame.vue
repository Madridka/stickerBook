<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import LoadableImage from '@/components/ui/LoadableImage.vue'
import { createSortingCards } from '@/utils/miniGameCards'
import { useMiniGameCards } from '@/composables/useMiniGameCards'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const config = PACK_HUNT_CONFIG.sort
const { cards, loading, error, attempt, reload, imageLoaded, imageFailed } = useMiniGameCards(createSortingCards)
const phase = ref<'ready' | 'playing' | 'feedback' | 'result' | 'done'>('ready')
const index = ref(0)
const correct = ref(0)
const remaining = ref(config.initialTimeMs)
const feedback = ref('')
const card = computed(() => cards.value[index.value]!)
const category = computed(() => card.value.rarity)
const limit = computed(() => Math.max(config.minimumTimeMs, config.initialTimeMs - index.value * config.accelerationMs))
let deadline = 0
let interval: ReturnType<typeof setInterval> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const startCard = (): void => {
  phase.value = 'playing'
  remaining.value = limit.value
  deadline = Date.now() + limit.value
}
const answer = (choice: number): void => {
  if (phase.value !== 'playing') return
  phase.value = 'feedback'
  const inTime = Date.now() < deadline
  const success = inTime && config.categories[choice] === category.value
  if (success) correct.value += 1
  feedback.value = success ? 'correct' : choice < 0 || !inTime ? 'timeout' : 'wrong'
  timer = setTimeout((): void => {
    if (index.value + 1 === config.cards) {
      phase.value = 'result'
      clearInterval(interval)
    } else {
      index.value += 1
      startCard()
    }
  }, config.feedbackMs)
}
const start = (): void => {
  if (phase.value !== 'ready' || loading.value || error.value) return
  startCard()
  interval = setInterval((): void => {
    if (phase.value !== 'playing') return
    remaining.value = Math.max(0, deadline - Date.now())
    if (!remaining.value) answer(-1)
  }, config.tickMs)
}
const finish = (): void => {
  if (phase.value !== 'result') return
  phase.value = 'done'
  emit('complete')
}
onBeforeUnmount((): void => { clearInterval(interval); clearTimeout(timer) })
</script>

<template>
  <section class="mx-auto w-full max-w-lg text-center" :aria-label="t('packHunt.games.sort.title')">
    <div class="hidden" aria-hidden="true"><img v-for="entry in cards" :key="`${attempt}-${entry.id}`" :src="entry.image" alt="" @load="imageLoaded(entry.id)" @error="imageFailed" /></div>
    <div v-if="error" class="p-6"><p>{{ t('packHunt.newGames.loadError') }}</p><Button class="mt-3" :label="t('packHunt.newGames.retry')" @click="reload" /></div>
    <p v-else-if="loading" class="p-6" role="status">{{ t('packHunt.newGames.loading') }}</p>
    <div v-else-if="phase === 'ready'" class="rounded-xl border-2 border-ink/15 bg-gold/10 p-6">
      <div class="mb-3 text-5xl" aria-hidden="true">📦</div>
      <p class="mb-4 text-sm">{{ t('packHunt.sort.intro', { count: config.cards }) }}</p>
      <Button :label="t('packHunt.newGames.start')" @click="start" />
    </div>
    <template v-else-if="phase === 'playing' || phase === 'feedback'">
      <p class="mb-2 text-sm font-bold">{{ t('packHunt.newGames.round', { current: index + 1, total: config.cards }) }}</p>
      <ProgressBar :value="remaining / limit * 100" :show-value="false" class="!h-2" :aria-label="t('packHunt.sort.time')" />
      <div class="mx-auto mt-3 w-[min(48%,23vh)]">
        <LoadableImage :key="card.id" :src="card.image" :alt="card.displayName" eager fit="contain" class="aspect-[5/7] w-full rounded-lg shadow-lg" />
        <p class="mt-1 truncate text-xs font-bold">{{ card.displayName }}</p>
        <p class="text-xs font-black">{{ t(`packHunt.newGames.${category}`) }}</p>
      </div>
      <p class="my-2 min-h-6 text-sm font-bold" aria-live="polite">{{ phase === 'feedback' ? t(`packHunt.sort.${feedback}`, { category: t(`packHunt.newGames.${category}`) }) : t('packHunt.sort.choose') }}</p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button v-for="(name, choice) in config.categories" :key="name" class="!px-1 !py-3 !text-xs sm:!text-sm" :label="t(`packHunt.newGames.${name}`)" :disabled="phase !== 'playing'" @click="answer(choice)" />
      </div>
    </template>
    <div v-else class="rounded-xl bg-mint/30 p-6" aria-live="polite">
      <p class="mb-4 text-lg font-black">{{ t('packHunt.sort.summary', { correct, total: config.cards }) }}</p>
      <Button :label="t('packHunt.newGames.finish')" :disabled="phase === 'done'" @click="finish" />
    </div>
  </section>
</template>
