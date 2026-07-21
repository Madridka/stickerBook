<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import cards from '@/data/wc-26/players'
import gameData from '@/data/mainConst.json'
import {
  useCollectionStore,
  type BeginDuplicateExchangeResult,
  type ClaimDuplicateExchangeResult,
} from '@/stores/collection'
import type { PlayerCard, StickerInstance } from '@/types'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

interface DuplicateGroup {
  playerId: string
  instances: StickerInstance[]
}

const { t } = useI18n()
const collection = useCollectionStore()
const selectionLimit: number = gameData.duplicateExchange.tradeInCount
const candidateCount: number = gameData.duplicateExchange.candidateCount
const selectedInstanceIds: Ref<string[]> = ref([])
const selectedCandidateId: Ref<string | undefined> = ref(undefined)
const rewardCardId: Ref<string | undefined> = ref(undefined)
const isConfirmVisible: Ref<boolean> = ref(false)
const hasError: Ref<boolean> = ref(false)

const duplicateGroups: ComputedRef<DuplicateGroup[]> = computed((): DuplicateGroup[] => {
  const groups: Map<string, StickerInstance[]> = new Map()
  collection.duplicates.forEach((instance: StickerInstance): void => {
    groups.set(instance.playerId, [...(groups.get(instance.playerId) ?? []), instance])
  })
  return Array.from(groups, ([playerId, instances]): DuplicateGroup => ({ playerId, instances }))
})
const candidateCards: ComputedRef<PlayerCard[]> = computed((): PlayerCard[] =>
  (collection.pendingExchange?.candidatePlayerIds ?? [])
    .map((playerId: string): PlayerCard | undefined => getCard(playerId))
    .filter((card: PlayerCard | undefined): card is PlayerCard => Boolean(card)),
)
const rewardCard: ComputedRef<PlayerCard | undefined> = computed((): PlayerCard | undefined =>
  rewardCardId.value ? getCard(rewardCardId.value) : undefined,
)
const canSubmit: ComputedRef<boolean> = computed(
  (): boolean => selectedInstanceIds.value.length === selectionLimit && !collection.isExchanging,
)

const getCard = (playerId: string): PlayerCard | undefined =>
  cards.find(({ id }): boolean => id === playerId)
const selectedCount = (group: DuplicateGroup): number =>
  group.instances.filter(({ id }): boolean => selectedInstanceIds.value.includes(id)).length
const isOwned = (playerId: string): boolean => collection.collected.includes(playerId)

const addFromGroup = (group: DuplicateGroup): void => {
  if (selectedInstanceIds.value.length >= selectionLimit) return
  const instance: StickerInstance | undefined = group.instances.find(
    ({ id }): boolean => !selectedInstanceIds.value.includes(id),
  )
  if (instance) selectedInstanceIds.value = [...selectedInstanceIds.value, instance.id]
}

const removeFromGroup = (group: DuplicateGroup): void => {
  const instance: StickerInstance | undefined = [...group.instances]
    .reverse()
    .find(({ id }): boolean => selectedInstanceIds.value.includes(id))
  if (!instance) return
  selectedInstanceIds.value = selectedInstanceIds.value.filter(
    (instanceId: string): boolean => instanceId !== instance.id,
  )
}

const openConfirmation = (): void => {
  if (!canSubmit.value) return
  hasError.value = false
  isConfirmVisible.value = true
}

// Сдача закрывает подтверждение только после атомарного удаления повторок и сохранения кандидатов.
const confirmExchange = async (): Promise<void> => {
  if (!canSubmit.value) return
  try {
    const result: BeginDuplicateExchangeResult = await collection.beginDuplicateExchange(
      selectedInstanceIds.value,
    )
    if (result === 'invalid-selection') {
      hasError.value = true
      return
    }
    selectedInstanceIds.value = []
    selectedCandidateId.value = undefined
    isConfirmVisible.value = false
  } catch {
    hasError.value = true
  }
}

// После выбора в базе остаётся только одна награда, остальные кандидаты исчезают вместе с обменом.
const claimCandidate = async (): Promise<void> => {
  if (!selectedCandidateId.value) return
  const playerId: string = selectedCandidateId.value
  try {
    const result: ClaimDuplicateExchangeResult = await collection.claimDuplicateExchange(playerId)
    if (result === 'invalid-choice') {
      hasError.value = true
      return
    }
    rewardCardId.value = playerId
    selectedCandidateId.value = undefined
  } catch {
    hasError.value = true
  }
}
</script>

<template>
  <section class="flex min-h-full flex-col" aria-labelledby="duplicate-exchange-title">
    <div
      class="sticky top-0 z-20 mb-3 border-2 border-ink bg-paper p-2 shadow-[3px_3px_0_rgb(var(--color-gold)/0.4)]"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 id="duplicate-exchange-title" class="text-sm font-black leading-tight sm:text-base">
            {{ t('duplicateExchange.title') }}
          </h2>
          <p class="mt-0.5 hidden max-w-2xl text-[11px] leading-tight text-ink/55 md:block">
            {{
              t('duplicateExchange.description', {
                count: selectionLimit,
                candidates: candidateCount,
              })
            }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2 min-w-40">
          <strong class="whitespace-nowrap text-xs sm:text-sm" data-exchange-selection>
            {{
              t('duplicateExchange.selected', {
                current: selectedInstanceIds.length,
                total: selectionLimit,
              })
            }}
          </strong>
          <Button
            icon="pi pi-sparkles"
            size="small"
            class="min-w-20"
            :disabled="!canSubmit"
            data-exchange-submit
            @click="openConfirmation"
          >
            <span class="sm:hidden">
              {{ t('duplicateExchange.submitShort', { count: selectionLimit }) }}
            </span>
            <span class="hidden sm:inline">{{
              t('duplicateExchange.submit', { count: selectionLimit })
            }}</span>
          </Button>
        </div>
      </div>
      <p v-if="hasError" class="mt-2 text-xs font-bold text-coral" role="alert">
        {{ t('duplicateExchange.error') }}
      </p>
    </div>

    <div
      v-if="rewardCard"
      class="mb-3 flex items-center gap-2 border border-emerald-700 bg-mint/35 px-2 py-1.5"
      aria-live="polite"
    >
      <i class="pi pi-check-circle text-base text-emerald-700" />
      <strong class="min-w-0 truncate text-sm">
        {{ t('duplicateExchange.rewardTitle') }} · {{ rewardCard.fullName }}
      </strong>
    </div>

    <div v-if="duplicateGroups.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <article
        v-for="group in duplicateGroups"
        :key="group.playerId"
        class="relative mb-1 mr-1 border-2 bg-paper p-1.5 transition-colors sm:p-2"
        :class="
          selectedCount(group) > 0
            ? 'border-coral shadow-[5px_5px_0_rgb(var(--color-coral)/0.35)]'
            : 'border-ink shadow-[5px_5px_0_rgb(var(--color-coral)/0.2)]'
        "
        data-duplicate-group
        :data-player-id="group.playerId"
      >
        <span
          class="absolute right-3 top-3 z-10 rounded-full bg-coral px-2 py-1 text-xs font-black text-white shadow"
        >
          ×{{ group.instances.length }}
        </span>
        <img
          v-if="getCard(group.playerId)"
          class="aspect-[2/3] w-full bg-white object-cover"
          :src="getCard(group.playerId)?.image"
          :alt="getCard(group.playerId)?.fullName"
        />
        <p class="mt-1 truncate text-xs font-black sm:text-sm">
          {{ getCard(group.playerId)?.fullName }}
        </p>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-coral">
          {{ t('duplicateExchange.selectedInGroup', { count: selectedCount(group) }) }}
        </p>
        <div class="mt-1 grid grid-cols-2 gap-1.5">
          <Button
            icon="pi pi-minus"
            size="small"
            severity="secondary"
            outlined
            :aria-label="t('duplicateExchange.remove', { name: getCard(group.playerId)?.fullName })"
            :disabled="selectedCount(group) === 0"
            data-duplicate-remove
            @click="removeFromGroup(group)"
          />
          <Button
            icon="pi pi-plus"
            size="small"
            :aria-label="t('duplicateExchange.add', { name: getCard(group.playerId)?.fullName })"
            :disabled="
              selectedInstanceIds.length >= selectionLimit ||
              selectedCount(group) >= group.instances.length
            "
            data-duplicate-add
            @click="addFromGroup(group)"
          />
        </div>
      </article>
    </div>
    <div
      v-else
      class="flex min-h-28 flex-col items-center justify-center border border-dashed border-ink/20 p-4 text-center"
    >
      <i class="pi pi-inbox text-2xl text-ink/25" />
      <strong class="mt-2 text-sm">{{ t('album.duplicatesEmptyTitle') }}</strong>
      <p class="mt-1 text-xs font-bold text-coral">
        {{ t('duplicateExchange.notEnough', { count: selectionLimit }) }}
      </p>
    </div>

    <Dialog
      v-model:visible="isConfirmVisible"
      modal
      :header="t('duplicateExchange.confirmTitle')"
      class="w-[calc(100vw-2rem)] max-w-lg"
    >
      <p class="text-sm text-ink/70">
        {{
          t('duplicateExchange.confirmText', {
            count: selectionLimit,
            candidates: candidateCount,
          })
        }}
      </p>
      <p class="mt-3 border border-coral/30 bg-coral/10 p-3 text-sm font-bold text-coral">
        {{ t('duplicateExchange.confirmWarning') }}
      </p>
      <p v-if="hasError" class="mt-3 text-sm font-bold text-coral" role="alert">
        {{ t('duplicateExchange.error') }}
      </p>
      <template #footer>
        <Button
          :label="t('duplicateExchange.cancel')"
          severity="secondary"
          outlined
          :disabled="collection.isExchanging"
          @click="isConfirmVisible = false"
        />
        <Button
          :label="
            t(
              collection.isExchanging
                ? 'duplicateExchange.processing'
                : 'duplicateExchange.confirm',
            )
          "
          icon="pi pi-trash"
          severity="danger"
          :loading="collection.isExchanging"
          data-exchange-confirm
          @click="confirmExchange"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="Boolean(collection.pendingExchange)"
      modal
      :closable="false"
      :close-on-escape="false"
      :dismissable-mask="false"
      class="w-[calc(100vw-1rem)] max-w-6xl"
    >
      <template #header>
        <div>
          <p class="text-xs font-black uppercase tracking-[0.16em] text-coral">
            {{ t('duplicateExchange.pickEyebrow', { count: candidateCount }) }}
          </p>
          <h2 class="mt-1 text-2xl font-black">{{ t('duplicateExchange.pickTitle') }}</h2>
        </div>
      </template>
      <p class="mb-3 hidden text-xs text-ink/60 sm:block">
        {{ t('duplicateExchange.pickText', { count: candidateCount }) }}
      </p>
      <p v-if="hasError" class="mb-3 text-sm font-bold text-coral" role="alert">
        {{ t('duplicateExchange.error') }}
      </p>
      <div
        class="grid auto-cols-[8rem] grid-flow-col gap-2 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-cols-5 sm:auto-cols-auto sm:gap-3"
      >
        <button
          v-for="card in candidateCards"
          :key="card.id"
          type="button"
          class="min-w-36 border-4 bg-paper p-2 text-left transition-all"
          :class="
            selectedCandidateId === card.id
              ? 'border-coral shadow-[6px_6px_0_rgb(var(--color-coral)/0.3)]'
              : 'border-ink/20 hover:border-ink'
          "
          :aria-label="t('duplicateExchange.chooseCandidate', { name: card.fullName })"
          :aria-pressed="selectedCandidateId === card.id"
          data-exchange-candidate
          :data-player-id="card.id"
          @click="selectedCandidateId = card.id"
        >
          <img
            class="aspect-[2/3] w-full bg-white object-cover"
            :src="card.image"
            :alt="card.fullName"
          />
          <strong class="mt-2 block truncate text-sm">{{ card.fullName }}</strong>
          <span
            class="mt-1 inline-block text-[10px] font-black uppercase tracking-wide"
            :class="isOwned(card.id) ? 'text-coral' : 'text-emerald-700'"
          >
            {{
              t(isOwned(card.id) ? 'duplicateExchange.alreadyOwned' : 'duplicateExchange.notOwned')
            }}
          </span>
        </button>
      </div>
      <template #footer>
        <Button
          :label="
            t(collection.isExchanging ? 'duplicateExchange.claiming' : 'duplicateExchange.claim')
          "
          icon="pi pi-check"
          :disabled="!selectedCandidateId"
          :loading="collection.isExchanging"
          data-exchange-claim
          @click="claimCandidate"
        />
      </template>
    </Dialog>
  </section>
</template>
