import { createRouter, createWebHistory } from 'vue-router';
import Videos from '@/views/Videos.vue';

const routes = [
  {
    path: '/',
    name: 'Videos',
    component: Videos,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
