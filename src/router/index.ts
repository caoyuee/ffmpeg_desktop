import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('@/pages/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/queue',
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'queue',
        name: 'EncodingQueue',
        component: () => import('@/pages/EncodingQueuePage.vue'),
      },
      {
        path: 'prepare',
        name: 'PrepareFiles',
        component: () => import('@/pages/PrepareFilesPage.vue'),
      },
      {
        path: 'params',
        name: 'ParameterPanel',
        component: () => import('@/pages/ParameterPanelPage.vue'),
      },
      {
        path: 'merge',
        name: 'Merge',
        component: () => import('@/pages/MergePage.vue'),
      },
      {
        path: 'mux',
        name: 'Mux',
        component: () => import('@/pages/MuxPage.vue'),
      },
      {
        path: 'player',
        name: 'Player',
        component: () => import('@/pages/PlayerPage.vue'),
      },
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('@/pages/PerformancePage.vue'),
      },
      {
        path: 'quality',
        name: 'QualityAssess',
        component: () => import('@/pages/QualityAssessPage.vue'),
      },
      {
        path: 'mediainfo',
        name: 'MediaInfo',
        component: () => import('@/pages/MediaInfoPage.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/SettingsPage.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
