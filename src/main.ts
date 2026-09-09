import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import App from '@/App.vue'
import router from '@/router'
import i18n from '@/plugins/usei18n/usei18n'
import { reportClientError } from '@/services/clientLogger'
import '@/assets/main.css'
import 'primeicons/primeicons.css'

// Монтируем корневой экран сразу: начальная навигация и ленивые маршруты не должны
// удерживать статический экран загрузки, особенно во время первой компиляции Vite.
const app = createApp(App)
app.config.errorHandler = (error: unknown, _instance, info: string): void => {
  reportClientError('vue-error', error, { source: 'vue', detail: info })
  if (import.meta.env.DEV) console.error(error)
}

app
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(MotionPlugin)
  .use(PrimeVue, { theme: { preset: Aura } })
  .mount('#app')
