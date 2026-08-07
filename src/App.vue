<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import AuthView from '@/components/auth/AuthView.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
void auth.initialize()
</script>

<template>
  <!-- Авторизация завершается до создания игровых stores и загрузки локального прогресса. -->
  <div
    v-if="auth.isInitializing"
    class="flex min-h-dvh items-center justify-center bg-paper text-sm font-bold text-ink"
  >
    {{ t('auth.loading') }}
  </div>
  <AppShell v-else-if="auth.user" />
  <AuthView v-else />
</template>
