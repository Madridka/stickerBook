import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import vueDevTools from 'vite-plugin-vue-devtools'

const CLIENT_ENV_ALLOWLIST: ReadonlySet<string> = new Set([
  'BASE_URL',
  'MODE',
  'DEV',
  'PROD',
  'SSR',
])

const ALBUM_DATA_CHUNKS: ReadonlyArray<readonly [directory: string, chunk: string]> = [
  ['wc-26', 'album-wc-26'],
  ['ucl-26-27', 'album-ucl-26-27'],
  ['russia', 'album-rpl-26-27'],
  ['rpl-26-27', 'album-rpl-26-27'],
  ['tomsk', 'album-tomsk'],
  ['spainClubsLogo', 'album-spain-clubs-logo'],
  ['russiaClubsLogo', 'album-russia-clubs-logo'],
  ['englandClubsLogo', 'album-england-clubs-logo'],
]

const resolveManualChunk = (id: string): string | undefined => {
  const normalizedId: string = id.replaceAll('\\', '/')
  const albumChunk = ALBUM_DATA_CHUNKS.find(([directory]) =>
    normalizedId.includes(`/src/data/${directory}/`) ||
    normalizedId.includes(`/assets/game/${directory}/`),
  )
  if (albumChunk) return albumChunk[1]

  if (!normalizedId.includes('/node_modules/')) return undefined
  if (
    /\/node_modules\/(?:vue|@vue|vue-router|vue-i18n|pinia|@vueuse)\//.test(normalizedId)
  ) {
    return 'vendor-vue'
  }
  if (/\/node_modules\/(?:primevue|@primevue)\//.test(normalizedId)) {
    return 'vendor-primevue'
  }
  if (normalizedId.includes('/node_modules/dexie/')) return 'vendor-storage'
  if (normalizedId.includes('/node_modules/zod/')) return 'vendor-validation'
  return 'vendor'
}

const preventClientSecrets = (): Plugin => ({
  name: 'prevent-client-secrets',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('node_modules') || !code.includes('import.meta.env')) return null
    if (/import\.meta\.env\s*\[/.test(code)) {
      this.error(`Dynamic import.meta.env access is forbidden in ${id}`)
    }
    for (const match of code.matchAll(/import\.meta\.env\.([A-Za-z_$][\w$]*)/g)) {
      if (!CLIENT_ENV_ALLOWLIST.has(match[1])) {
        this.error(`Client environment variable ${match[1]} is forbidden in ${id}`)
      }
    }
    return null
  },
})

const productionCsp = (): Plugin => ({
  name: 'production-content-security-policy',
  transformIndexHtml: {
    order: 'pre',
    handler: () => [{
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content:
          "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.jsdelivr.net; font-src 'self' data:; connect-src 'self'",
      },
      injectTo: 'head-prepend',
    }],
  },
})

export default defineConfig(({ mode }) => {
  const production: boolean = mode === 'production'
  return {
    plugins: [
      vue(),
      preventClientSecrets(),
      ...(production ? [productionCsp()] : [vueDevTools()]),
    ],
    base: process.env.GITHUB_ACTIONS
      ? process.env.GITHUB_REPOSITORY?.endsWith('.github.io')
        ? '/'
        : `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''}/`
      : '/',
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
    esbuild: production ? { drop: ['console', 'debugger'] } : undefined,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      allowedHosts: ['sticker-book.ru', 'www.sticker-book.ru'],
      port: 4040,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:4041',
        '/admin': 'http://127.0.0.1:4041',
      },
    },
    preview: {
      host: true,
      allowedHosts: ['sticker-book.ru', 'www.sticker-book.ru'],
    },
  }
})
