import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: process.env.GITHUB_ACTIONS
    ? process.env.GITHUB_REPOSITORY?.endsWith('.github.io')
      ? '/'
      : `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''}/`
    : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    cors: {
      preflightContinue: true,
    },
    port: 4040,
  },
})
