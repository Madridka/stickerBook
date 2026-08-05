<script setup lang="ts">
import type { CardDefinition, StickerInstance } from '@/types'
import LoadableImage from '@/components/ui/LoadableImage.vue'

interface Props {
  card: CardDefinition
  instance: StickerInstance
}

defineProps<Props>()
</script>

<template>
  <div class="relative h-full w-full overflow-hidden rounded bg-white p-1">
    <LoadableImage
      class="h-full w-full"
      :src="card.image"
      :alt="card.displayName"
      fit="contain"
    />
    <span class="absolute bottom-1 left-1 rounded bg-ink/85 px-1 text-[9px] font-bold text-paper">
      {{ instance.quality }}%
    </span>
  </div>
</template>
