import { createRouter, createWebHistory } from 'vue-router'
import MapView from '../views/MapView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MapView
    },
    {
      path: '/chart',
      name: 'chart',
      component: () => import('../views/ChartView.vue')
    }
  ]
})

export default router
