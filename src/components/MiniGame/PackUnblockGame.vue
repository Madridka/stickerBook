<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'
import { shuffleMiniGameItems } from '@/utils/miniGameCards'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const config = PACK_HUNT_CONFIG.unblock
const round = ref(0)
const makeLayers = (): number[] => shuffleMiniGameItems(config.straps.map((_, index) => index).slice(0, config.strapCounts[round.value]))
const layers = ref(makeLayers())
const removing = ref<number | undefined>()
const mistake = ref<number | undefined>()
const done = ref(false)
const accessibleTop = computed(() => config.straps[layers.value[layers.value.length - 1]!]?.symbol ?? '')
let timer: ReturnType<typeof setTimeout> | undefined

const release = (id: number): void => {
  if (done.value || removing.value !== undefined || !layers.value.includes(id)) return
  clearTimeout(timer)
  if (id !== layers.value[layers.value.length - 1]) {
    mistake.value = id
    timer = setTimeout(() => { mistake.value = undefined }, config.releaseMs)
    return
  }
  mistake.value = undefined
  removing.value = id
  timer = setTimeout(() => {
    layers.value = layers.value.filter((layer) => layer !== id)
    removing.value = undefined
  }, config.releaseMs)
}
const next = (): void => {
  if (layers.value.length || done.value) return
  if (round.value + 1 === config.strapCounts.length) {
    done.value = true
    emit('complete')
  } else { round.value += 1; layers.value = makeLayers() }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section class="mx-auto w-full max-w-lg text-center" :aria-label="t('packHunt.games.unblock.title')">
    <p class="text-xs font-bold">{{ t('packHunt.newGames.round', { current: round + 1, total: config.strapCounts.length }) }}</p>
    <svg viewBox="0 0 400 400" class="mx-auto block h-[min(43vh,380px)] w-full" aria-hidden="true">
      <defs><linearGradient id="release-pack" x2="1" y2="1"><stop stop-color="#f9d97e" /><stop offset=".5" stop-color="#e8ad46" /><stop offset="1" stop-color="#fff1bd" /></linearGradient></defs>
      <rect x="20" y="20" width="360" height="360" rx="40" fill="#eae4d9" />
      <circle cx="200" cy="200" r="150" fill="#f6f2e9" />
      <g :class="{ 'pack-freed': !layers.length }">
        <rect x="122" y="85" width="156" height="230" rx="10" fill="url(#release-pack)" stroke="#bd8b31" stroke-width="2" />
        <path d="M130 99 H270 M130 301 H270" stroke="#bd8b31" stroke-width="8" stroke-dasharray="2 3" />
        <path d="M122 240 L278 135 V200 L122 305Z" fill="#182530" />
        <circle cx="200" cy="172" r="37" fill="#fffaf0" stroke="#182530" stroke-width="3" />
        <path d="M200 151 L220 166 L212 190 H188 L180 166Z" fill="#182530" />
        <text x="200" y="255" text-anchor="middle" fill="#fffaf0" font-size="17" font-weight="900">{{ t('packHunt.packLabel') }}</text>
      </g>
      <!-- Тени на пересечениях показывают, какая лента лежит сверху. -->
      <g v-for="id in layers" :key="`${round}-${id}`" :class="{ 'strap-release': removing === id, 'strap-shake': mistake === id }">
        <path :d="config.straps[id]!.path" stroke="#182530" stroke-opacity=".3" stroke-width="30" stroke-linecap="round" fill="none" transform="translate(0 4)" />
        <path :d="config.straps[id]!.path" :stroke="config.straps[id]!.color" stroke-width="24" stroke-linecap="round" fill="none" />
        <path :d="config.straps[id]!.path" stroke="white" stroke-opacity=".45" stroke-width="2" stroke-dasharray="5 6" fill="none" />
        <circle :cx="config.straps[id]!.x" :cy="config.straps[id]!.y" r="18" :fill="config.straps[id]!.color" stroke="#182530" stroke-width="2" />
        <text :x="config.straps[id]!.x" :y="config.straps[id]!.y + 6" text-anchor="middle" font-size="19" fill="#182530">{{ config.straps[id]!.symbol }}</text>
      </g>
    </svg>
    <p class="sr-only" aria-live="polite">{{ t('packHunt.unblock.accessibleTop', { symbol: accessibleTop }) }}</p>
    <div v-if="layers.length" class="flex justify-center gap-2">
      <Button v-for="(strap, id) in config.straps.slice(0, config.strapCounts[round])" :key="id"
        class="!h-12 !w-12 !rounded-xl !border-2 !border-ink/20 !p-0 !text-xl !text-ink sm:!h-14 sm:!w-14"
        :style="{ backgroundColor: strap.color }" :label="strap.symbol"
        :aria-label="t('packHunt.unblock.release', { symbol: strap.symbol })"
        :disabled="!layers.includes(id) || removing !== undefined" @click="release(id)" />
    </div>
    <p class="my-2 min-h-5 text-sm font-bold" aria-live="polite">{{ !layers.length ? t('packHunt.unblock.freed') : mistake !== undefined ? t('packHunt.unblock.blocked') : t('packHunt.unblock.remaining', { count: layers.length }) }}</p>
    <Button v-if="!layers.length" :label="t(round + 1 === config.strapCounts.length ? 'packHunt.newGames.finish' : 'packHunt.newGames.next')" :disabled="done" @click="next" />
  </section>
</template>

<style scoped>
.strap-release { animation: release .4s ease-in forwards; transform-origin: center; }
.strap-shake { animation: shake .25s ease-in-out; }
.pack-freed { animation: freed .5s ease-out both; transform-origin: center; }
@keyframes release { to { opacity: 0; transform: translateY(-45px) scale(1.15); } }
@keyframes shake { 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
@keyframes freed { to { transform: rotate(-7deg) scale(1.08); } }
@media (prefers-reduced-motion: reduce) { .strap-release, .strap-shake, .pack-freed { animation-duration: .01s; } }
</style>
