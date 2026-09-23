import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/layout/index.vue'
const routes = [{ path: '/', component: Layout, redirect: '/dashboard', children: [
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '总览' } },
  { path: '/analytics', name: 'Analytics', component: () => import('@/views/Analytics.vue'), meta: { title: '数据分析' } },
  { path: '/chatlog', name: 'ChatLog', component: () => import('@/views/ChatLog.vue'), meta: { title: '聊天记录' } },
  { path: '/contacts', name: 'Contacts', component: () => import('@/views/Contacts.vue'), meta: { title: '联系人' } },
  { path: '/chatrooms', name: 'ChatRooms', component: () => import('@/views/ChatRooms.vue'), meta: { title: '群聊' } },
  { path: '/sessions', name: 'Sessions', component: () => import('@/views/Sessions.vue'), meta: { title: '会话' } },
  { path: '/media', name: 'Media', component: () => import('@/views/Media.vue'), meta: { title: '媒体库' } }
] }, { path: '/:pathMatch(.*)*', redirect: '/dashboard' }]
export default createRouter({ history: createWebHistory(process.env.BASE_URL), routes })
