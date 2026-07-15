import i18n from '@/plugins/usei18n/usei18n'
import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('app.home'),
      },
    },
    {
      path: '/shop',
      name: 'shop',
      component: () => import('@/views/ShopView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('app.shop'),
      },
    },
    {
      path: '/album',
      name: 'album',
      component: () => import('@/views/AlbumView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('app.album'),
      },
    },
  ],
})

export default router
