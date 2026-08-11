import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
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
    // Bind explicitly to every local IPv4 interface. This keeps the dev server
    // reachable when a VPN adds/removes interfaces and changes their priority.
    host: '0.0.0.0',
    allowedHosts: ['sticker-book.ru', 'www.sticker-book.ru'],
    cors: {
      preflightContinue: true,
    },
    port: 4040,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4041',
      '/admin': 'http://127.0.0.1:4041',
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['sticker-book.ru', 'www.sticker-book.ru'],
  },
})
