<script setup lang="ts">
import type { PlayerCard, StickerInstance } from '@/types'

interface Props {
  card: PlayerCard
  instance: StickerInstance
}

defineProps<Props>()
</script>

<template>
  <div class="relative h-full w-full overflow-hidden rounded bg-white p-1">
    <img
      class="h-full w-full object-contain"
      :src="card.image"
      :alt="card.fullName"
      draggable="false"
    />
    <span class="absolute bottom-1 left-1 rounded bg-ink/85 px-1 text-[9px] font-bold text-paper">
      {{ instance.quality }}%
    </span>
  </div>
</template>
