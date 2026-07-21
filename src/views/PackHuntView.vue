<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { usePackHuntStore, type PackHuntClaimResult } from '@/stores/packHunt'
import { formatCountdown } from '@/utils/formatCountdown'
import {
  isPackMiniGameId,
  selectPackMiniGame,
  type PackMiniGameId,
} from '@/utils/selectPackMiniGame'

import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

import PackHuntGame from '@/components/MiniGame/PackHuntGame.vue'
import PackMachineGame from '@/components/MiniGame/PackMachineGame.vue'
import PackRackGame from '@/components/MiniGame/PackRackGame.vue'
import PackShellGame from '@/components/MiniGame/PackShellGame.vue'
import PackPuzzleGame from '@/components/MiniGame/PackPuzzleGame.vue'

type HuntPhase = 'loading' | 'playing' | 'saving' | 'won' | 'cooldown' | 'error'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const inventory = useInventoryStore()
const packHunt = usePackHuntStore()
const phase: Ref<HuntPhase> = ref('loading')
const requestedGame: unknown = route.query.game
const selectedGame: Ref<PackMiniGameId> = ref(
  isPackMiniGameId(requestedGame) ? requestedGame : selectPackMiniGame(),
)
const gameComponents: Record<PackMiniGameId, Component> = {
  signal: PackHuntGame,
  rack: PackRackGame,
  machine: PackMachineGame,
  shell: PackShellGame,
  puzzle: PackPuzzleGame,
}
const selectedGameComponent: ComputedRef<Component> = computed(
  (): Component => gameComponents[selectedGame.value],
)
const gameTranslationPrefix: ComputedRef<string> = computed(
  (): string => `packHunt.games.${selectedGame.value}`,
)
const cooldownText: ComputedRef<string> = computed((): string =>
  formatCountdown(packHunt.cooldownRemainingMs),
)

// Выдаёт уже найденную награду и синхронизирует общий инвентарь перед открытием.
const saveReward = async (): Promise<void> => {
  phase.value = 'saving'
  try {
    const result: PackHuntClaimResult = await packHunt.claimReward()
    if (result === 'cooldown-active') {
      phase.value = 'cooldown'
      return
    }
    await inventory.load()
    phase.value = 'won'
  } catch {
    phase.value = 'error'
  }
}

const handleGameComplete = (): void => {
  void saveReward()
}

const openPack = async (): Promise<void> => {
  await router.push({ name: 'pack-opening' })
}

const returnToShop = async (): Promise<void> => {
  await router.push({ name: 'shop' })
}

watch(
  (): boolean => packHunt.canPlay,
  (canPlay: boolean): void => {
    if (canPlay && phase.value === 'cooldown') phase.value = 'playing'
  },
)

onMounted(async (): Promise<void> => {
  await packHunt.load()
  if (!isPackMiniGameId(requestedGame)) {
    await router.replace({ query: { ...route.query, game: selectedGame.value } })
  }
  phase.value = packHunt.canPlay ? 'playing' : 'cooldown'
})
</script>

<template>
  <section
    class="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col items-center justify-center"
  >
    <div v-if="phase === 'loading'" class="flex flex-col items-center gap-4" aria-live="polite">
      <ProgressSpinner class="h-12 w-12" stroke-width="5" />
      <p class="font-bold text-ink/60">{{ t('packHunt.saving') }}</p>
    </div>

    <template v-else-if="phase === 'playing' || phase === 'saving'">
      <header class="mb-2 w-full text-center sm:mb-3">
        <p class="hidden text-[10px] font-black uppercase tracking-[0.16em] text-coral sm:block">
          {{ t('packHunt.eyebrow') }}
        </p>
        <div class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <h1 class="text-2xl font-black tracking-tight sm:text-4xl">
            {{ t(`${gameTranslationPrefix}.title`) }}
          </h1>
          <span class="border border-ink/15 px-3 py-1 text-xs font-bold text-ink/55">
            {{
              t('packHunt.cooldownRule')
            }}
          </span>
        </div>
        <p class="mx-auto mt-0.5 hidden max-w-2xl text-xs leading-tight text-ink/55 md:block">
          {{ t(`${gameTranslationPrefix}.description`) }}
        </p>
        <p class="mt-0.5 text-[11px] font-semibold leading-tight text-ink/50">
          {{ t(`${gameTranslationPrefix}.hint`) }}
        </p>
      </header>

      <component :is="selectedGameComponent" @complete="handleGameComplete" />
      <p v-if="phase === 'saving'" class="mt-3 font-bold text-coral" aria-live="polite">
        {{ t('packHunt.saving') }}
      </p>
    </template>

    <!-- Итоговые состояния отделены от механики поля и помещаются в один viewport. -->
    <div v-else class="flex max-w-xl flex-col items-center text-center">
      <div
        class="flex h-20 w-20 items-center justify-center rounded-full text-4xl"
        :class="phase === 'won' ? 'bg-mint text-ink' : 'bg-coral/15 text-coral'"
      >
        <i :class="phase === 'won' ? 'pi pi-gift' : 'pi pi-calendar-times'" />
      </div>

      <template v-if="phase === 'won'">
        <h1 class="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
          {{ t('packHunt.wonTitle') }}
        </h1>
        <p class="mt-3 text-ink/65">{{ t('packHunt.wonText') }}</p>
        <p class="mt-3 border border-gold/50 bg-gold/15 px-4 py-2 text-sm font-black">
          {{ t('packHunt.inventoryCount', { count: inventory.packCount }) }}
        </p>
      </template>

      <template v-else-if="phase === 'error'">
        <h1 class="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
          {{ t('packHunt.errorTitle') }}
        </h1>
        <p class="mt-3 text-ink/65">{{ t('packHunt.errorText') }}</p>
      </template>

      <template v-else>
        <h1 class="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
          {{ t('packHunt.cooldownTitle') }}
        </h1>
        <p class="mt-3 text-ink/65">
          {{ t('packHunt.cooldownText', { time: cooldownText }) }}
        </p>
      </template>

      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <Button
          v-if="phase === 'won'"
          :label="t('packHunt.openPack')"
          icon="pi pi-gift"
          type="button"
          @click="openPack"
        />
        <Button
          v-if="phase === 'error'"
          :label="t('packHunt.retryReward')"
          icon="pi pi-refresh"
          type="button"
          @click="saveReward"
        />
        <Button
          :label="t('packHunt.backToShop')"
          icon="pi pi-arrow-left"
          :outlined="phase === 'won' || phase === 'error'"
          type="button"
          @click="returnToShop"
        />
      </div>
    </div>
  </section>
</template>
