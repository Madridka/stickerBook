<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  kind: 'wrong' | 'far'
}

interface Emits {
  'update:visible': [visible: boolean]
  confirm: []
  cancel: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="t(`stickerTray.${kind}Title`)"
    :style="{ width: 'min(25rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="text-sm leading-relaxed text-ink/70">{{ t(`stickerTray.${kind}Text`) }}</p>
    <template #footer>
      <Button :label="t('stickerTray.cancel')" text type="button" @click="emit('cancel')" />
      <Button :label="t('stickerTray.confirm')" icon="pi pi-check" type="button" @click="emit('confirm')" />
    </template>
  </Dialog>
</template>
