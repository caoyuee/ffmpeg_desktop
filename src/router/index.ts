import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/pages/MainLayout/index.vue'),
    children: [
      {
        path: '',
        redirect: '/workbench',
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/pages/Home/index.vue'),
      },
      {
        path: 'workbench',
        name: 'Workbench',
        component: () => import('@/pages/Workbench/index.vue'),
      },
      {
        path: 'watch',
        name: 'WatchFolder',
        component: () => import('@/pages/WatchFolder/index.vue'),
      },
      {
        path: 'ab',
        name: 'ABCompare',
        component: () => import('@/pages/ABCompare/index.vue'),
      },
      {
        path: 'queue',
        name: 'EncodingQueue',
        component: () => import('@/pages/EncodingQueue/index.vue'),
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('@/pages/History/index.vue'),
      },
      {
        path: 'prepare',
        name: 'PrepareFiles',
        component: () => import('@/pages/PrepareFiles/index.vue'),
      },
      {
        path: 'params',
        name: 'ParameterPanel',
        component: () => import('@/pages/ParameterPanel/index.vue'),
      },
      {
        path: 'merge',
        name: 'Merge',
        component: () => import('@/pages/Merge/index.vue'),
      },
      {
        path: 'mux',
        name: 'Mux',
        component: () => import('@/pages/Mux/index.vue'),
      },
      {
        path: 'player',
        name: 'Player',
        component: () => import('@/pages/Player/index.vue'),
      },
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('@/pages/Performance/index.vue'),
      },
      {
        path: 'quality',
        name: 'QualityAssess',
        component: () => import('@/pages/QualityAssess/index.vue'),
      },
      {
        path: 'mediainfo',
        name: 'MediaInfo',
        component: () => import('@/pages/MediaInfo/index.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/Settings/index.vue'),
      },
    ],
  },
  {
    path: '/independent-panel',
    name: 'IndependentPanel',
    component: () => import('@/pages/IndependentPanel/index.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
