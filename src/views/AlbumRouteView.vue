<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <RouterView :key="String(route.params.albumId ?? 'library')" />
</template>
