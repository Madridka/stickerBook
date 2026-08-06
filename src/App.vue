<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
import { ref } from 'vue'
import type { Ref } from 'vue'

const isAdmin: Ref<boolean> = ref(false)
const halaMadrid = '/spainClubsLogo/cards/spain/la-liga/ESP1-16-real-madrid.webp'
</script>

<template>
  <!-- Корневой shell приложения -->
  <AppShell v-if="isAdmin" />
  <div v-else class="flex min-h-screen w-full flex-col items-center justify-center gap-6">
    <p>ты не админ, не лазь сюда. как починю, так верну</p>
    <img class="h-auto max-h-[70vh] max-w-full" :src="halaMadrid" alt="Real Madrid" />
  </div>
</template>
