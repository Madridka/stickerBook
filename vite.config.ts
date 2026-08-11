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
    // A dual-stack listener and localhost proxy keep local traffic working when
    // a VPN intercepts either the IPv4 or IPv6 loopback route.
    host: '::',
    allowedHosts: ['sticker-book.ru', 'www.sticker-book.ru'],
    cors: {
      preflightContinue: true,
    },
    port: 4040,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4041',
      '/admin': 'http://localhost:4041',
    },
  },
  preview: {
    host: '::',
    allowedHosts: ['sticker-book.ru', 'www.sticker-book.ru'],
  },
})
