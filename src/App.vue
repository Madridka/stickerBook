<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import ProgressExportView from '@/components/ProgressExportView.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
void auth.initialize()

const isAdmin = false
</script>

<template>
  <!-- Авторизация завершается до создания игровых stores и загрузки локального прогресса. -->
  <div
    v-if="auth.isInitializing"
    class="flex min-h-dvh items-center justify-center bg-paper text-sm font-bold text-ink"
  >
    {{ t('auth.loading') }}
  </div>
  <div v-if="isAdmin">пока что тут нечего смотреть</div>
  <AppShell v-else-if="auth.user" />
  <ProgressExportView v-else />
</template>
