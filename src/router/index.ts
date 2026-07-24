import i18n from '@/plugins/usei18n/usei18n'
import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'

// Описывает маршруты основных разделов приложения
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
      component: () => import('@/views/AlbumRouteView.vue'),
      children: [
        {
          path: '',
          name: 'album',
          component: () => import('@/views/AlbumLibraryView.vue'),
          meta: {
            title: (i18n.global.t as (key: string) => string)('app.album'),
          },
        },
        {
          path: 'wc-26',
          name: 'album-wc-26',
          component: () => import('@/views/AlbumView.vue'),
          meta: {
            title: (i18n.global.t as (key: string) => string)(
              'album.library.items.wc-26.title',
            ),
            albumWorkspace: true,
          },
        },
      ],
    },
    {
      path: '/collection',
      name: 'collection',
      component: () => import('@/views/CollectionView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('app.collection'),
      },
    },
    {
      path: '/goals',
      name: 'goals',
      component: () => import('@/views/GoalsView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('app.goals'),
      },
    },
    {
      path: '/pack-opening',
      name: 'pack-opening',
      component: () => import('@/views/PackOpeningView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('packOpening.title'),
        packOpening: true,
      },
    },
    {
      path: '/pack-hunt',
      name: 'pack-hunt',
      component: () => import('@/views/PackHuntView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('packHunt.title'),
      },
    },
  ],
})

export default router
