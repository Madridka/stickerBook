<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import LoadableImage from '@/components/ui/LoadableImage.vue'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'
import { createOddCards } from '@/utils/miniGameCards'
import { useMiniGameCards } from '@/composables/useMiniGameCards'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const config = PACK_HUNT_CONFIG.odd
const { cards, loading, error, attempt, reload, imageLoaded, imageFailed } = useMiniGameCards(createOddCards)
const round = ref(0)
const solved = ref(false)
const complete = ref(false)
const wrong = ref<string[]>([])
const count = config.sameClubCount + 1
const roundCards = computed(() => cards.value.slice(round.value * count, (round.value + 1) * count))
const oddCard = computed(() => roundCards.value.find((card) => roundCards.value.filter((other) => other.teamId === card.teamId).length === 1))
const choose = (id: string): void => {
  if (loading.value || error.value || solved.value || complete.value || wrong.value.includes(id)) return
  if (id === oddCard.value?.id) solved.value = true
  else wrong.value.push(id)
}
const next = (): void => {
  if (!solved.value || complete.value) return
  if (round.value + 1 === config.rounds) { complete.value = true; emit('complete') }
  else { round.value += 1; solved.value = false; wrong.value = [] }
}
</script>

<template>
  <section class="mx-auto w-full max-w-2xl text-center" :aria-label="t('packHunt.games.odd.title')">
    <div class="hidden" aria-hidden="true">
      <img v-for="(card, index) in cards" :key="`${attempt}-${index}`" :src="card.image" alt="" @load="imageLoaded(card.id)" @error="imageFailed" />
    </div>
    <div v-if="error" class="p-6"><p>{{ t('packHunt.newGames.loadError') }}</p><Button class="mt-3" :label="t('packHunt.newGames.retry')" @click="reload" /></div>
    <p v-else-if="loading" class="p-6" role="status">{{ t('packHunt.newGames.loading') }}</p>
    <template v-else>
      <p class="text-xs font-bold">{{ t('packHunt.newGames.round', { current: round + 1, total: config.rounds }) }}</p>
      <p class="my-2 text-sm font-black">{{ t('packHunt.odd.clubRule') }}</p>
      <div class="mx-auto grid max-w-[min(100%,34vh)] grid-cols-2 gap-2 sm:max-w-none sm:grid-cols-4 sm:gap-3">
        <Button v-for="card in roundCards" :key="card.id" outlined
          class="!block !min-w-0 !overflow-hidden !rounded-lg !border-2 !border-ink/15 !bg-paper !p-0 !text-ink"
          :class="{ 'ring-4 ring-emerald-500': solved && card.id === oddCard?.id }"
          :disabled="solved || complete || wrong.includes(card.id)" :aria-label="card.displayName" @click="choose(card.id)">
          <LoadableImage :src="card.image" :alt="card.displayName" eager fit="contain" class="aspect-[5/7] w-full" />
          <span class="block truncate px-1 py-1 text-[10px] font-bold sm:text-xs">{{ card.displayName }}</span>
        </Button>
      </div>
      <p class="my-2 min-h-5 text-sm font-bold" aria-live="polite">{{ solved ? t('packHunt.odd.correct') : wrong.length ? t('packHunt.odd.retry') : '' }}</p>
      <Button v-if="solved" :label="t(round + 1 === config.rounds ? 'packHunt.newGames.finish' : 'packHunt.newGames.next')" :disabled="complete" @click="next" />
    </template>
  </section>
</template>
