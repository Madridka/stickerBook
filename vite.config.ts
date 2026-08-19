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
