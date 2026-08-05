import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import App from '@/App.vue'
import router from '@/router'
import i18n from '@/plugins/usei18n/usei18n'
import '@/assets/main.css'
import 'primeicons/primeicons.css'

// Установка router запускает начальную навигацию, но статический экран из index.html
// остаётся видимым, пока lazy-маршрут не будет готов к первому рендеру.
const app = createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(MotionPlugin)
  .use(PrimeVue, { theme: { preset: Aura } })

const mountApplication = (): void => {
  app.mount('#app')
}

void router.isReady().then(mountApplication, mountApplication)
