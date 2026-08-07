<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
import { ref } from 'vue'
import type { Ref } from 'vue'

const isAdmin: Ref<boolean> = ref(false)
const halaMadrid = 'https://i.pinimg.com/originals/60/0e/19/600e1949da76a5a2b715ac009e1ac378.jpg'
</script>

<template>
  <!-- Корневой shell приложения -->
  <AppShell v-if="isAdmin" />
  <div v-else class="flex min-h-screen w-full flex-col items-center justify-center gap-6">
    <p>ты не админ, не лазь сюда. как починю, так верну</p>
    <img class="h-auto max-h-[70vh] max-w-full" :src="halaMadrid" alt="Hala Madrid" />
  </div>
</template>
