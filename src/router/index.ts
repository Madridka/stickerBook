import i18n from '@/plugins/usei18n/usei18n'
import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'

// Описывает маршруты основных разделов приложения
const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (to) =>
    to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 },
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
          path: 'kdv',
          redirect: { name: 'album-detail', params: { albumId: 'tomsk' } },
        },
        {
          path: ':albumId',
          name: 'album-detail',
          component: () => import('@/views/AlbumView.vue'),
          meta: {
            title: (i18n.global.t as (key: string) => string)('app.album'),
            albumWorkspace: true,
          },
        },
      ],
    },
    {
      path: '/spainClubsLogo',
      name: 'spain-clubs-logo',
      redirect: { name: 'album-detail', params: { albumId: 'spainClubsLogo' } },
    },
    {
      path: '/russiaClubsLogo',
      name: 'russia-clubs-logo',
      redirect: { name: 'album-detail', params: { albumId: 'russiaClubsLogo' } },
    },
    {
      path: '/englandClubsLogo',
      name: 'england-clubs-logo',
      redirect: { name: 'album-detail', params: { albumId: 'englandClubsLogo' } },
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
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('@/views/LeaderboardView.vue'),
      meta: {
        title: (i18n.global.t as (key: string) => string)('app.leaderboard'),
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
