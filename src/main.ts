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

// Создаёт приложение и подключает глобальные плагины перед монтированием
createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(MotionPlugin)
  .use(PrimeVue, { theme: { preset: Aura } })
  .mount('#app')
