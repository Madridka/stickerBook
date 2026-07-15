import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import router from './router'
import i18n from './locales'
import './assets/main.css'

createApp(App).use(createPinia()).use(router).use(i18n).use(MotionPlugin).mount('#app')
