import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import type { AdminPermission, AdminUser } from './types'
import Login from './views/Login.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    permission?: AdminPermission
    systemOnly?: boolean
  }
}

function storedAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) as AdminUser : null
  } catch {
    return null
  }
}

function canOpenRoute(route: RouteLocationNormalized, admin: AdminUser | null) {
  if (!admin) return true
  if (admin.role === 'system_admin') return true
  if (route.meta.systemOnly) return false
  if (route.meta.permission) return admin.permissions?.includes(route.meta.permission) ?? false
  return true
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
    return false
  },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { title: 'Đăng nhập' },
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('./views/Dashboard.vue'),
      meta: { title: 'Tổng quan' },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('./views/BloodInventoryAi.vue'),
      meta: { title: 'Kho máu & Dự báo AI' },
    },
    {
      path: '/hospitals',
      name: 'hospitals',
      component: () => import('./views/HospitalManagement.vue'),
      meta: { title: 'Bệnh viện', systemOnly: true },
    },
    {
      path: '/sos/:alertId?',
      name: 'sos',
      component: () => import('./views/SosAlerts.vue'),
      meta: { title: 'Cấp cứu SOS', permission: 'sos.activate' },
    },
    {
      path: '/events/:eventId?',
      name: 'events',
      component: () => import('./views/DonationEvents.vue'),
      meta: { title: 'Lịch hiến máu', permission: 'events.manage' },
    },
    {
      path: '/donations',
      name: 'donations',
      component: () => import('./views/Donations.vue'),
      meta: { title: 'Quản lý Quyên góp', permission: 'events.manage' },
    },
    {
      path: '/id-verifications',
      name: 'id-verifications',
      component: () => import('./views/IdVerifications.vue'),
      meta: { title: 'Xác thực căn cước', permission: 'staff.manage' },
    },
    {
      path: '/community',
      name: 'community',
      component: () => import('./views/CommunityPosts.vue'),
      meta: { title: 'Bài viết cộng đồng', permission: 'posts.manage' },
    },
    {
      path: '/staff',
      name: 'rbac',
      component: () => import('./views/RbacManagement.vue'),
      meta: { title: 'Nhân sự & RBAC', permission: 'staff.manage' },
    },
    {
      path: '/settings/ai',
      name: 'settings',
      component: () => import('./views/Settings.vue'),
      meta: { title: 'Cấu hình AI', systemOnly: true },
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('./views/Forbidden.vue'),
      meta: { title: 'Không có quyền truy cập' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('./views/NotFound.vue'),
      meta: { title: 'Không tìm thấy trang' },
    },
  ],
})

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem('admin_token'))
  if (!hasToken && to.name !== 'login') {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (hasToken && to.name === 'login') {
    return { name: 'dashboard' }
  }
  if (hasToken && !canOpenRoute(to, storedAdmin())) {
    return { name: 'forbidden', query: { from: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Điều hành'} · Pulse Link Admin`
})

export default router
