<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const config = PACK_HUNT_CONFIG.penalty
const phase = ref<'ready' | 'aim' | 'flight' | 'result' | 'summary' | 'done'>('ready')
const aim = ref({ x: config.goal.left + config.keyboardStep, y: config.goal.top + config.keyboardStep })
const keeper = ref({ x: config.keeperCenter, y: config.keeperY })
const diveAngle = ref(0)
const ball = ref({ ...config.ballStart, scale: 1 })
const results = ref<('goal' | 'saved' | 'miss')[]>([])
const lastResult = computed(() => results.value[results.value.length - 1] ?? 'goal')
const goals = computed(() => results.value.filter((result) => result === 'goal').length)
const canShoot = computed(() => phase.value === 'aim')
let frame = 0
let resultTimer: ReturnType<typeof setTimeout> | undefined
let startAt = 0
let shotAt = 0
let origin = { ...keeper.value }
let destination = { ...keeper.value }
let target = { ...aim.value }
const offset = Math.random() * Math.PI * 2

const animate = (now: number): void => {
  if (phase.value === 'aim' || phase.value === 'ready') {
    const period = config.keeperPeriodMs - results.value.length * config.roundAccelerationMs
    keeper.value = { x: config.keeperCenter + Math.sin((now - startAt) / period * Math.PI * 2 + offset) * config.keeperAmplitude, y: config.keeperY }
  }
  if (phase.value === 'flight') {
    const progress = Math.min(1, (now - shotAt) / config.flightMs)
    const diveProgress = Math.min(1, progress * config.diveProgressMultiplier)
    keeper.value = { x: origin.x + (destination.x - origin.x) * diveProgress, y: origin.y + (destination.y - origin.y) * diveProgress }
    diveAngle.value = (destination.x > origin.x ? config.diveAngle : -config.diveAngle) * Math.sin(diveProgress * Math.PI / 2)
    ball.value = {
      x: config.ballStart.x + (target.x - config.ballStart.x) * progress,
      y: config.ballStart.y + (target.y - config.ballStart.y) * progress - Math.sin(progress * Math.PI) * config.flightArc,
      scale: 1 - progress * config.ballScaleReduction,
    }
    if (progress === 1) {
      phase.value = 'result'
      resultTimer = setTimeout(() => {
        if (results.value.length === config.shots) phase.value = 'summary'
        else { phase.value = 'aim'; ball.value = { ...config.ballStart, scale: 1 }; diveAngle.value = 0 }
      }, config.resultMs)
    }
  }
  frame = requestAnimationFrame(animate)
}
const shoot = (): void => {
  if (!canShoot.value) return
  target = { ...aim.value }
  origin = { ...keeper.value }
  destination = {
    x: origin.x + Math.max(-config.diveDistance, Math.min(config.diveDistance, target.x - origin.x)),
    y: origin.y + Math.max(-config.diveHeight, Math.min(config.diveHeight, target.y - origin.y)),
  }
  const onTarget = target.x > config.goal.left && target.x < config.goal.right && target.y > config.goal.top && target.y < config.goal.bottom
  const saved = Math.abs(target.x - destination.x) <= config.keeperReachX && Math.abs(target.y - destination.y) <= config.keeperReachY
  results.value.push(!onTarget ? 'miss' : saved ? 'saved' : 'goal')
  shotAt = performance.now()
  phase.value = 'flight'
}
const point = (event: PointerEvent): void => {
  if (!canShoot.value) return
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const scale = Math.min(rect.width / config.fieldWidth, rect.height / config.fieldHeight)
  if (!scale) return
  aim.value = {
    x: (event.clientX - rect.left - (rect.width - config.fieldWidth * scale) / 2) / scale,
    y: (event.clientY - rect.top - (rect.height - config.fieldHeight * scale) / 2) / scale,
  }
}
const pointerShot = (event: PointerEvent): void => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  point(event)
  shoot()
}
const keyboard = (event: KeyboardEvent): void => {
  const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); shoot(); return }
  const move = moves[event.key]
  if (!move || !canShoot.value) return
  event.preventDefault()
  aim.value = {
    x: Math.max(0, Math.min(config.fieldWidth, aim.value.x + move[0] * config.keyboardStep)),
    y: Math.max(0, Math.min(config.fieldHeight, aim.value.y + move[1] * config.keyboardStep)),
  }
}
const finish = (): void => {
  if (phase.value !== 'summary') return
  phase.value = 'done'
  emit('complete')
}
onMounted(() => { startAt = performance.now(); frame = requestAnimationFrame(animate) })
onBeforeUnmount(() => { cancelAnimationFrame(frame); clearTimeout(resultTimer) })
</script>

<template>
  <section class="mx-auto w-full max-w-2xl text-center" :aria-label="t('packHunt.games.penalty.title')">
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-xs font-bold" aria-live="polite">{{ t('packHunt.penalty.score', { shot: results.length, total: config.shots, goals }) }}</p>
      <div class="flex gap-1" aria-hidden="true"><span v-for="index in config.shots" :key="index" class="flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 text-xs" :class="results[index - 1] === 'goal' ? 'bg-mint' : results[index - 1] ? 'bg-coral/30' : 'bg-white'">{{ results[index - 1] === 'goal' ? '✓' : results[index - 1] ? '×' : '·' }}</span></div>
    </div>
    <svg :viewBox="`0 0 ${config.fieldWidth} ${config.fieldHeight}`" class="block h-[min(43vh,360px)] w-full touch-none rounded-2xl border-2 border-ink/20 outline-offset-4 focus-visible:outline focus-visible:outline-coral"
      tabindex="0" role="application" :aria-label="t('packHunt.penalty.controls')" @pointermove="point" @pointerdown.prevent="pointerShot" @keydown="keyboard">
      <defs>
        <pattern id="penalty-net" width="20" height="18" patternUnits="userSpaceOnUse"><path d="M20 0H0V18" fill="none" stroke="white" stroke-opacity=".25" /></pattern>
        <linearGradient id="penalty-turf" x2="0" y2="1"><stop stop-color="#163c3b" /><stop offset="1" stop-color="#3d885e" /></linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#penalty-turf)" />
      <path d="M0 0H600V45H0Z" fill="#162734" />
      <path v-for="row in 3" :key="row" :d="`M15 ${row * 12}H585`" stroke="#ecbd63" stroke-width="4" stroke-dasharray="3 12" opacity=".55" />
      <path d="M0 235H600 M0 305H600" stroke="white" stroke-opacity=".04" stroke-width="35" />
      <path d="M65 205L15 355H585L535 205 M200 355Q300 235 400 355" fill="none" stroke="white" stroke-opacity=".4" stroke-width="2" />
      <rect :x="config.goal.left" :y="config.goal.top" :width="config.goal.right - config.goal.left" :height="config.goal.bottom - config.goal.top" fill="#142d31" />
      <rect :x="config.goal.left" :y="config.goal.top" :width="config.goal.right - config.goal.left" :height="config.goal.bottom - config.goal.top" fill="url(#penalty-net)" stroke="#f8f4e9" stroke-width="7" />
      <ellipse :cx="keeper.x" cy="208" rx="35" ry="7" fill="black" opacity=".2" />
      <g :transform="`translate(${keeper.x} ${keeper.y}) rotate(${diveAngle})`" data-testid="keeper">
        <path d="M-12 18L-19 48 M12 18L19 48" stroke="#172733" stroke-width="13" stroke-linecap="round" />
        <path d="M-12 -16L-35 -28 M12 -16L35 -28" stroke="#fbba48" stroke-width="12" stroke-linecap="round" />
        <rect x="-17" y="-25" width="34" height="48" rx="8" fill="#fbba48" />
        <circle cy="-40" r="13" fill="#edc6a1" />
        <circle cx="-38" cy="-31" r="9" fill="#f8f4e9" /><circle cx="38" cy="-31" r="9" fill="#f8f4e9" />
      </g>
      <g v-if="canShoot" :transform="`translate(${aim.x} ${aim.y})`" stroke="#fff1ab" fill="none" pointer-events="none"><circle r="14" stroke-width="2" /><path d="M-21 0H21 M0 -21V21" /></g>
      <g :transform="`translate(${ball.x} ${ball.y}) scale(${ball.scale})`" pointer-events="none"><circle r="17" fill="#fffaf0" stroke="#172733" stroke-width="2" /><path d="M0 -9L9 -3L6 8H-6L-9 -3Z" fill="#172733" /></g>
      <g v-if="phase === 'result'" pointer-events="none"><rect x="140" y="245" width="320" height="55" rx="12" fill="#172733" fill-opacity=".9" /><text x="300" y="279" text-anchor="middle" fill="white" font-size="24" font-weight="900">{{ t(`packHunt.penalty.${lastResult}`) }}</text></g>
    </svg>
    <p class="my-2 min-h-5 text-xs font-bold" role="status">{{ phase === 'aim' ? t('packHunt.penalty.timing') : phase === 'flight' ? t('packHunt.penalty.flying') : phase === 'result' ? t(`packHunt.penalty.${lastResult}`) : t('packHunt.penalty.intro') }}</p>
    <Button v-if="phase === 'ready'" :label="t('packHunt.newGames.start')" @click="phase = 'aim'" />
    <Button v-else-if="phase === 'summary' || phase === 'done'" :label="t('packHunt.newGames.finish')" :disabled="phase === 'done'" @click="finish" />
    <Button v-else :label="t('packHunt.penalty.shoot')" :disabled="!canShoot" @click="shoot" />
  </section>
</template>
