<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAlbumCard, getPlayerAlbumById } from '@/data/albumRegistry'
import { useCollectionStore } from '@/stores/collection'
import { usePickShopStore } from '@/stores/pickShop'
import type { CardDefinition, PickCandidateRef } from '@/types'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import LoadableImage from '@/components/ui/LoadableImage.vue'

interface CandidateView {
  key: string
  ref: PickCandidateRef
  card: CardDefinition
  albumName: string
  isNew: boolean
}

const { t } = useI18n()
const pickShop = usePickShopStore()
const collection = useCollectionStore()
const selectedKey: Ref<string | null> = ref(null)
const error: Ref<boolean> = ref(false)

const candidates: ComputedRef<CandidateView[]> = computed(() =>
  (pickShop.pendingDraft?.candidates ?? []).flatMap((candidate): CandidateView[] => {
    const card: CardDefinition | undefined = getAlbumCard(candidate.albumId, candidate.playerId)
    if (!card) return []
    const key: string = `${candidate.albumId}:${candidate.playerId}`
    return [{
      key,
      ref: candidate,
      card,
      albumName: getPlayerAlbumById(candidate.albumId)?.shortName
        ? t(getPlayerAlbumById(candidate.albumId)!.shortName)
        : candidate.albumId,
      isNew: !pickShop.ownedKeys.has(key),
    }]
  }),
)

const claim = async (): Promise<void> => {
  const selected: CandidateView | undefined = candidates.value.find(
    ({ key }): boolean => key === selectedKey.value,
  )
  if (!selected) return
  error.value = false
  const result = await pickShop.claimPick(selected.ref)
  if (result !== 'claimed') {
    error.value = true
    return
  }
  selectedKey.value = null
  await collection.load()
}
</script>

<template>
  <Dialog
    :visible="Boolean(pickShop.pendingDraft)"
    modal
    :closable="false"
    :close-on-escape="false"
    class="w-[min(64rem,calc(100vw-1.5rem))]"
    :header="t('shop.pickDialog.title')"
  >
    <div class="border border-mint/60 bg-mint/20 p-3 text-sm font-bold">
      <i class="pi pi-sparkles mr-2 text-coral" />
      {{
        pickShop.pendingDraft?.guaranteedNew
          ? t('shop.pickDialog.guaranteed')
          : t('shop.pickDialog.description')
      }}
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <button
        v-for="candidate in candidates"
        :key="candidate.key"
        type="button"
        class="relative border-2 bg-paper p-2 text-left transition"
        :class="selectedKey === candidate.key
          ? 'border-coral shadow-[5px_5px_0_rgb(var(--color-coral)/0.4)]'
          : 'border-ink/30 hover:border-ink'"
        @click="selectedKey = candidate.key"
      >
        <span
          class="absolute right-3 top-3 z-10 rounded-full px-2 py-1 text-[10px] font-black uppercase"
          :class="candidate.isNew ? 'bg-mint text-ink' : 'bg-ink/75 text-paper'"
        >
          {{ candidate.isNew ? t('shop.pickDialog.newCard') : t('shop.pickDialog.owned') }}
        </span>
        <LoadableImage
          class="aspect-[2/3] w-full bg-white object-cover"
          :src="candidate.card.image"
          :alt="candidate.card.displayName"
          fit="cover"
        />
        <p class="mt-2 truncate text-sm font-black">{{ candidate.card.displayName }}</p>
        <p class="truncate text-[10px] font-bold uppercase text-coral">{{ candidate.albumName }}</p>
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm font-bold text-coral" role="alert">
      {{ t('shop.pickDialog.error') }}
    </p>

    <template #footer>
      <Button
        :label="t('shop.pickDialog.claim')"
        icon="pi pi-check"
        :disabled="!selectedKey"
        :loading="pickShop.isProcessing"
        @click="claim"
      />
    </template>
  </Dialog>
</template>
