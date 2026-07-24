<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarRange,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  X,
  Settings,
  HeartHandshake,
  Database,
  ShieldCheck,
  RefreshCw,
  Wifi,
  WifiOff,
  PanelLeftClose,
  PanelLeftOpen,
} from '@lucide/vue'
import SosModal from './components/SosModal.vue'
import AdminConfirmDialog from './components/AdminConfirmDialog.vue'
import AdminToastViewport from './components/AdminToastViewport.vue'
import AdminPromptDialog from './components/AdminPromptDialog.vue'
import AdminRouteSkeleton from './components/AdminRouteSkeleton.vue'
import Login from './views/Login.vue'
import { useEmergencyDashboard } from './composables/useEmergencyDashboard'
import { confirmAction, notify } from './composables/useAdminUi'
import { apiFetch } from './services/api'
import type { EmergencyAlert, EmergencyCommitment, SosPayload } from './types'
import pulseLinkIcon from './assets/pulse_link_icon.png'
import pulseLinkLogo from './assets/pulse_link_logo.png'

type ViewKey = 'dashboard' | 'hospitals' | 'sos' | 'events' | 'community' | 'rbac' | 'settings' | 'donations' | 'inventory' | 'id-verifications'

interface NavItem {
  key: ViewKey
  label: string
  shortLabel: string
  icon: Component
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const route = useRoute()
const router = useRouter()
const {
  hospitals,
  stats,
  alerts,
  activeAlerts,
  activeAlert,
  activeAlertCommitments,
  commitments,
  currentAdmin,
  selectedAlertId,
  selectedHospitalId,
  selectedHospital,
  isLoading,
  dashboardError,
  realtimeStatus,
  lastUpdatedAt,
  loadDashboard,
  loadProvinces,
  activateSos,
  cancelSos,
  completeSos,
  markCommitmentDonated,
  updateCommitmentJourney,
  selectAlert,
} = useEmergencyDashboard(apiBaseUrl)

const isLoggedIn = ref(!!localStorage.getItem('admin_token'))
const showSosModal = ref(false)
const mobileMenuOpen = ref(false)
const sidebarCollapsed = ref(localStorage.getItem('admin_sidebar_collapsed') === 'true')
const showNotifications = ref(false)
const currentTime = ref(new Date())
const sosSubmitError = ref<string | null>(null)
const isSubmittingSos = ref(false)
let clockTimer: number | undefined
let lastApiErrorToastAt = 0
const viewKeys: ViewKey[] = ['dashboard', 'hospitals', 'sos', 'events', 'community', 'rbac', 'settings', 'donations', 'inventory', 'id-verifications']
const currentView = computed<ViewKey | null>(() => viewKeys.includes(route.name as ViewKey) ? route.name as ViewKey : null)

const navigation: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { key: 'inventory', label: 'Kho máu & Dự báo AI', shortLabel: 'Kho & AI', icon: Database },
  { key: 'hospitals', label: 'Bệnh viện', shortLabel: 'BV', icon: Building2 },
  { key: 'sos', label: 'Cấp cứu SOS', shortLabel: 'SOS', icon: AlertTriangle },
  { key: 'events', label: 'Lịch hiến máu', shortLabel: 'Sự kiện', icon: CalendarRange },
  { key: 'donations', label: 'Quản lý Quyên góp', shortLabel: 'Quyên góp', icon: HeartHandshake },
  { key: 'id-verifications', label: 'Xác thực căn cước', shortLabel: 'CCCD', icon: ShieldCheck },
  { key: 'community', label: 'Bài viết cộng đồng', shortLabel: 'Bài viết', icon: FileText },
  { key: 'rbac', label: 'Nhân sự & RBAC', shortLabel: 'RBAC', icon: ShieldAlert },
  { key: 'settings', label: 'Cấu hình AI', shortLabel: 'AI', icon: Settings },
]

const filteredNavigation = computed(() => {
  const user = currentAdmin.value
  if (!user) return []

  return navigation.filter((item) => {
    if (user.role === 'system_admin') return true

    switch (item.key) {
      case 'dashboard':
        return true
      case 'inventory':
        return true
      case 'hospitals':
        return false // Chỉ có system_admin quản lý bệnh viện
      case 'sos':
        return user.permissions?.includes('sos.activate')
      case 'events':
        return user.permissions?.includes('events.manage')
      case 'donations':
        return user.permissions?.includes('events.manage')
      case 'id-verifications':
        return user.permissions?.includes('staff.manage')
      case 'community':
        return user.permissions?.includes('posts.manage')
      case 'rbac':
        return user.permissions?.includes('staff.manage')
      case 'settings':
        return false // Chỉ system_admin mới cấu hình được chatbot AI
      default:
        return false
    }
  })
})

watch([filteredNavigation, () => route.name], ([nav]) => {
  if (currentAdmin.value && currentView.value && nav.length > 0 && !nav.some((item) => item.key === currentView.value)) {
    void router.replace({ name: 'forbidden', query: { from: route.fullPath } })
  }
})

watch(() => route.fullPath, () => {
  if (currentView.value) {
    sessionStorage.setItem(`admin:last-route:${currentView.value}`, route.fullPath)
  }
})

watch(currentAdmin, (admin) => {
  if (admin) localStorage.setItem('admin_user', JSON.stringify(admin))
})

watch(selectedHospitalId, (hospitalId, previousHospitalId) => {
  if (!hospitalId) return
  localStorage.setItem('admin_hospital_id', String(hospitalId))
  if (String(route.query.hospital ?? '') !== String(hospitalId)) {
    void router.replace({ query: { ...route.query, hospital: String(hospitalId) } })
  }
  if (previousHospitalId !== null && Number(previousHospitalId) !== Number(hospitalId)) {
    void loadDashboard()
  }
})

watch(() => route.query.hospital, (hospitalId) => {
  const normalized = Number(hospitalId)
  if (Number.isFinite(normalized) && normalized > 0 && normalized !== Number(selectedHospitalId.value)) {
    selectedHospitalId.value = normalized
  }
})

watch(() => route.params.alertId, (alertId) => {
  if (route.name === 'sos' && typeof alertId === 'string' && alertId) selectAlert(alertId)
}, { immediate: true })

const formattedTime = computed(() =>
  currentTime.value.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }),
)
const activeViewLabel = computed(() => filteredNavigation.value.find((item) => item.key === currentView.value)?.label ?? String(route.meta.title ?? 'Tổng quan'))
const adminInitials = computed(() => {
  const words = (currentAdmin.value?.name ?? 'Pulse Link')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return words.slice(-2).map((word) => word[0]).join('').toUpperCase()
})

function switchView(view: ViewKey) {
  mobileMenuOpen.value = false
  const savedRoute = sessionStorage.getItem(`admin:last-route:${view}`)
  if (savedRoute) {
    void router.push(savedRoute)
    return
  }
  void router.push({
    name: view,
    query: selectedHospitalId.value ? { hospital: String(selectedHospitalId.value) } : {},
  })
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('admin_sidebar_collapsed', String(sidebarCollapsed.value))
}

function openSosView(alertId?: string) {
  void router.push({
    name: 'sos',
    params: alertId ? { alertId } : {},
    query: selectedHospitalId.value ? { hospital: String(selectedHospitalId.value) } : {},
  })
  mobileMenuOpen.value = false
}

function handleSelectAlert(alertId: string) {
  selectAlert(alertId)
  openSosView(alertId)
}

async function handleCancelSos(alert: EmergencyAlert) {
  const confirmed = await confirmAction({
    title: 'Hủy phát lệnh SOS?',
    message: `Ca ${alert.required_blood_type} tại ${alert.hospital?.name ?? 'bệnh viện'} sẽ dừng điều phối và người hiến không còn nhận cập nhật mới.`,
    confirmLabel: 'Hủy ca SOS',
  })
  if (!confirmed) return
  try {
    await cancelSos(alert)
    notify('Đã hủy ca SOS.', 'warning')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Không thể hủy ca SOS.', 'error')
  }
}

async function handleCompleteSos(alert: EmergencyAlert) {
  const confirmed = await confirmAction({
    title: 'Kết thúc ca SOS?',
    message: 'Hãy chắc chắn nhu cầu cấp cứu đã được đáp ứng và mọi người hiến đang di chuyển đã được xử lý trạng thái.',
    confirmLabel: 'Hoàn thành ca',
    tone: 'primary',
  })
  if (!confirmed) return
  try {
    await completeSos(alert)
    notify('Ca SOS đã được hoàn thành.')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Không thể hoàn thành ca SOS.', 'error')
  }
}

async function handleMarkCommitmentDonated(alert: EmergencyAlert, commitment: EmergencyCommitment, volumeMl: number) {
  const confirmed = await confirmAction({
    title: 'Xác nhận người hiến đã hoàn tất?',
    message: `Ghi nhận ${commitment.donor?.name ?? 'người hiến'} đã hiến ${volumeMl} ml. Thao tác này sẽ tạo lịch sử hiến và hành trình giọt máu.`,
    confirmLabel: 'Xác nhận đã hiến',
    tone: 'primary',
  })
  if (!confirmed) return
  try {
    await markCommitmentDonated(alert, commitment, volumeMl)
    notify('Đã ghi nhận hiến máu SOS thành công.')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Không thể ghi nhận hiến máu.', 'error')
  }
}

async function handleUpdateCommitmentJourney(
  alert: EmergencyAlert,
  commitment: EmergencyCommitment,
  payload: { destination_type?: 'patient' | 'reserve'; current_step?: string; location_label?: string; publish?: boolean },
) {
  try {
    await updateCommitmentJourney(alert, commitment, payload)
    notify('Đã cập nhật hành trình giọt máu.')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Không thể cập nhật hành trình giọt máu.', 'error')
  }
}

function openSosModal() {
  sosSubmitError.value = null
  showSosModal.value = true
}

async function submitSos(payload: SosPayload) {
  sosSubmitError.value = null
  isSubmittingSos.value = true
  try {
    await activateSos(payload)
    showSosModal.value = false
    openSosView(selectedAlertId.value ?? undefined)
  } catch (error) {
    sosSubmitError.value = error instanceof Error ? error.message : 'Không thể phát lệnh SOS.'
  } finally {
    isSubmittingSos.value = false
  }
}

async function handleLoginSuccess() {
  isLoggedIn.value = true
  await Promise.all([loadDashboard(), loadProvinces()])
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  await router.replace(redirect)
}

async function handleLogout() {
  try {
    await apiFetch(`${apiBaseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    // Bỏ qua lỗi mạng khi đăng xuất
  }
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  currentAdmin.value = null
  isLoggedIn.value = false
  await router.replace({ name: 'login' })
}

function handleSessionExpired() {
  if (!isLoggedIn.value) return
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  currentAdmin.value = null
  isLoggedIn.value = false
  notify('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning')
  void router.replace({ name: 'login', query: { redirect: route.fullPath } })
}

function handleApiUnavailable() {
  const now = Date.now()
  if (now - lastApiErrorToastAt < 5000) return
  lastApiErrorToastAt = now
  notify('Kết nối máy chủ đang không ổn định. Hệ thống sẽ tự thử lại với các yêu cầu đọc dữ liệu.', 'error')
}

const routeViewProps = computed<Record<string, unknown>>(() => {
  switch (currentView.value) {
    case 'dashboard':
      return {
        stats: stats.value,
        activeAlerts: activeAlerts.value,
        commitments: commitments.value,
        isLoading: isLoading.value,
        apiBaseUrl,
        selectedHospitalId: selectedHospitalId.value,
      }
    case 'sos':
      return {
        alerts: alerts.value,
        activeAlerts: activeAlerts.value,
        activeAlert: activeAlert.value,
        selectedAlertId: selectedAlertId.value,
        commitments: activeAlertCommitments.value,
        stats: stats.value,
        isLoading: isLoading.value,
      }
    case 'inventory':
      return { apiBaseUrl, selectedHospitalId: selectedHospitalId.value }
    case 'donations':
    case 'id-verifications':
    case 'settings':
      return { apiBaseUrl }
    default:
      return {}
  }
})
const realtimeLabel = computed(() => ({
  idle: 'Chưa kết nối realtime',
  connecting: 'Đang kết nối Reverb',
  connected: 'API & Reverb trực tuyến',
  disconnected: 'Mất kết nối Reverb',
  error: 'Reverb gặp sự cố',
})[realtimeStatus.value])
const realtimeHealthy = computed(() => realtimeStatus.value === 'connected')
const operationalNotifications = computed(() => [
  ...(dashboardError.value ? [{ tone: 'error', title: 'Không thể đồng bộ dữ liệu', detail: dashboardError.value }] : []),
  ...(!realtimeHealthy.value ? [{ tone: 'warning', title: realtimeLabel.value, detail: 'Dữ liệu REST vẫn dùng được, nhưng cập nhật SOS có thể chậm.' }] : []),
  ...activeAlerts.value.map((alert) => ({
    tone: 'alert',
    title: `SOS ${alert.required_blood_type} đang hoạt động`,
    detail: `${alert.hospital?.name ?? 'Bệnh viện'} · cần ${alert.units_needed} đơn vị`,
  })),
])
const lastUpdatedLabel = computed(() => lastUpdatedAt.value
  ? lastUpdatedAt.value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  : 'chưa có')

const routeViewListeners = computed<Record<string, (...args: never[]) => unknown>>(() => {
  switch (currentView.value) {
    case 'dashboard':
      return {
        openSos: openSosModal,
        openSosView: () => openSosView(),
        openInventory: () => switchView('inventory'),
        openEvents: () => switchView('events'),
      }
    case 'sos':
      return {
        openSos: openSosModal,
        selectAlert: handleSelectAlert,
        cancelAlert: handleCancelSos,
        completeAlert: handleCompleteSos,
        markCommitmentDonated: handleMarkCommitmentDonated,
        updateCommitmentJourney: handleUpdateCommitmentJourney,
      } as Record<string, (...args: never[]) => unknown>
    case 'inventory':
      return { openSosView: () => openSosView() }
    default:
      return {}
  }
})

onMounted(async () => {
  window.addEventListener('admin:session-expired', handleSessionExpired)
  window.addEventListener('admin:api-unavailable', handleApiUnavailable)
  if (isLoggedIn.value) {
    const routeHospitalId = Number(route.query.hospital)
    const storedHospitalId = Number(localStorage.getItem('admin_hospital_id'))
    const initialHospitalId = Number.isFinite(routeHospitalId) && routeHospitalId > 0
      ? routeHospitalId
      : storedHospitalId
    if (Number.isFinite(initialHospitalId) && initialHospitalId > 0) {
      selectedHospitalId.value = initialHospitalId
    }
    await Promise.all([loadDashboard(), loadProvinces()])
  }
  clockTimer = window.setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  window.removeEventListener('admin:session-expired', handleSessionExpired)
  window.removeEventListener('admin:api-unavailable', handleApiUnavailable)
  if (clockTimer) window.clearInterval(clockTimer)
})
</script>

<template>
  <div v-if="!isLoggedIn" class="flex min-h-screen items-center justify-center bg-slate-950 p-4">
    <Login @login-success="handleLoginSuccess" />
  </div>
  <div v-else class="flex min-h-screen bg-[#F8FAFC] text-slate-950">
    <aside
      class="sticky top-0 hidden h-screen shrink-0 border-r border-neutral-800 bg-[#1A1A1A] text-white transition-[width] duration-200 md:flex md:flex-col"
      :class="sidebarCollapsed ? 'w-24' : 'w-72'"
      :data-sidebar-collapsed="sidebarCollapsed"
    >
      <div class="flex h-16 items-center gap-2 border-b border-neutral-800" :class="sidebarCollapsed ? 'justify-center px-2' : 'px-4'">
        <div class="relative grid h-10 w-10 place-items-center rounded-md bg-white p-1.5">
          <img :src="pulseLinkIcon" alt="Pulse Link" class="max-h-full max-w-full object-contain" />
          <span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#E31837]" />
        </div>
        <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
          <p class="text-lg font-black uppercase tracking-wider">
            Pulse <span class="text-[#E31837]">Link</span>
          </p>
          <p class="truncate text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Mạch Sống - Cổng bệnh viện</p>
        </div>
        <button
          type="button"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white"
          :aria-label="sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'"
          :aria-expanded="!sidebarCollapsed"
          @click="toggleSidebar"
        >
          <PanelLeftOpen v-if="sidebarCollapsed" class="h-4 w-4" />
          <PanelLeftClose v-else class="h-4 w-4" />
        </button>
      </div>

      <nav class="flex-1 space-y-1.5 overflow-y-auto py-6" :class="sidebarCollapsed ? 'px-2' : 'px-4'">
        <button
          v-for="item in filteredNavigation"
          :key="item.key"
          class="relative flex w-full items-center rounded-md py-3 text-sm font-bold transition"
          :class="[
            sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-4 text-left',
            currentView === item.key
              ? sidebarCollapsed
                ? 'bg-white/10 text-white ring-1 ring-inset ring-[#E31837]/40'
                : 'border-l-4 border-[#E31837] bg-white/10 pl-3 text-white'
              : 'text-neutral-400 hover:bg-white/5 hover:text-white',
          ]"
          :title="sidebarCollapsed ? item.label : undefined"
          :aria-label="sidebarCollapsed ? item.label : undefined"
          @click="switchView(item.key)"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" :class="item.key === 'sos' ? 'text-amber-400' : ''" />
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          <span
            v-if="item.key === 'sos' && activeAlerts.length"
            class="rounded-full bg-[#E31837] text-xs font-black text-white"
            :class="sidebarCollapsed ? 'absolute right-1 top-1 grid h-5 min-w-5 place-items-center px-1' : 'ml-auto px-2 py-0.5'"
          >
            {{ activeAlerts.length }}
          </span>
        </button>
      </nav>

      <div class="pb-4" :class="sidebarCollapsed ? 'px-2' : 'px-4'">
        <div
          class="rounded-lg border"
          :class="[
            sidebarCollapsed ? 'grid h-12 place-items-center p-0' : 'p-3',
            realtimeHealthy ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5',
          ]"
          :title="sidebarCollapsed ? `${realtimeLabel} · Cập nhật cuối ${lastUpdatedLabel}` : undefined"
        >
          <template v-if="sidebarCollapsed">
            <Wifi v-if="realtimeHealthy" class="h-5 w-5 text-emerald-400" />
            <WifiOff v-else class="h-5 w-5 text-amber-400" />
          </template>
          <template v-else>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Hệ thống vận hành</p>
          <div class="mt-3 flex items-center gap-2 text-xs font-bold" :class="realtimeHealthy ? 'text-emerald-400' : 'text-amber-400'">
            <Wifi v-if="realtimeHealthy" class="h-4 w-4" />
            <WifiOff v-else class="h-4 w-4" />
            {{ realtimeLabel }}
          </div>
          <p class="mt-1 text-xs font-semibold text-neutral-500">Cập nhật cuối: {{ lastUpdatedLabel }}</p>
          </template>
        </div>
      </div>

      <div class="flex items-center border-t border-neutral-800 bg-black/20 p-4" :class="sidebarCollapsed ? 'justify-center' : 'gap-3'">
        <div class="grid h-9 w-9 place-items-center rounded-full bg-[#E31837] text-xs font-black">{{ adminInitials }}</div>
        <div v-if="!sidebarCollapsed" class="min-w-0">
          <p class="truncate text-xs font-black text-white">{{ currentAdmin?.name ?? 'Quản trị Pulse Link' }}</p>
          <p class="truncate text-xs font-semibold text-neutral-500">{{ currentAdmin?.scope_label ?? 'Mạch Sống - Điều phối' }}</p>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <button class="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 md:hidden" @click="mobileMenuOpen = !mobileMenuOpen">
            <component :is="mobileMenuOpen ? X : Menu" class="h-5 w-5" />
          </button>
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <img :src="pulseLinkIcon" alt="Pulse Link" class="max-h-full max-w-full object-contain" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-black uppercase tracking-wide text-slate-900">
              {{ selectedHospital?.name ?? 'Bệnh viện điều phối Pulse Link' }}
            </p>
            <p class="truncate text-xs font-semibold text-slate-500">
              {{ activeViewLabel }} · {{ selectedHospital?.province?.full_name ?? 'Đang tải dữ liệu' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <select
            v-model="selectedHospitalId"
            class="hidden h-10 max-w-72 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#E31837] lg:block"
          >
            <option v-for="hospital in hospitals" :key="hospital.id" :value="hospital.id">
              {{ hospital.name }} - {{ hospital.province?.full_name ?? hospital.province_code }}
            </option>
          </select>

          <div class="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500 xl:flex">
            <Clock3 class="h-4 w-4 text-slate-400" />
            {{ formattedTime }}
          </div>

          <div class="relative">
            <button class="relative grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Thông báo hệ thống" :aria-expanded="showNotifications" @click="showNotifications = !showNotifications">
              <span v-if="operationalNotifications.length" class="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E31837]" />
              <Bell class="h-5 w-5" />
            </button>
            <div v-if="showNotifications" class="absolute right-0 top-12 z-40 w-[min(88vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p class="text-sm font-black text-slate-950">Thông báo vận hành</p>
                  <p class="text-xs font-semibold text-slate-400">Cập nhật cuối {{ lastUpdatedLabel }}</p>
                </div>
                <button class="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100" aria-label="Đóng thông báo" @click="showNotifications = false"><X class="h-4 w-4" /></button>
              </div>
              <div v-if="operationalNotifications.length" class="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                <button v-for="(notification, index) in operationalNotifications" :key="index" class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50" @click="notification.tone === 'alert' ? openSosView() : undefined">
                  <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" :class="notification.tone === 'error' ? 'bg-red-500' : notification.tone === 'warning' ? 'bg-amber-500' : 'bg-[#E31837]'" />
                  <span>
                    <span class="block text-xs font-black text-slate-800">{{ notification.title }}</span>
                    <span class="mt-0.5 block text-xs font-semibold leading-relaxed text-slate-500">{{ notification.detail }}</span>
                  </span>
                </button>
              </div>
              <div v-else class="px-4 py-8 text-center text-sm font-semibold text-slate-400">Không có cảnh báo mới.</div>
            </div>
          </div>

          <button
            class="inline-flex h-10 items-center gap-2 rounded-md bg-[#E31837] px-3 text-xs font-black uppercase tracking-wide text-white shadow-sm shadow-red-500/20 transition hover:bg-red-700 active:scale-[0.98]"
            @click="openSosModal"
          >
            <AlertTriangle class="h-4 w-4" />
            <span class="hidden sm:inline">Phát lệnh SOS</span>
          </button>

          <button
            class="hidden h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 sm:flex"
            @click="handleLogout"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div v-if="mobileMenuOpen" class="border-b border-neutral-800 bg-[#1A1A1A] p-2 md:hidden">
        <div class="mb-2 rounded-md bg-white p-2">
          <img :src="pulseLinkLogo" alt="Pulse Link" class="h-10 w-auto object-contain" />
        </div>
        <div class="grid grid-cols-3 gap-1 sm:grid-cols-6">
          <button
            v-for="item in filteredNavigation"
            :key="item.key"
            class="flex flex-col items-center gap-1 rounded-md p-2 text-xs font-bold"
            :class="currentView === item.key ? 'bg-white/10 text-white' : 'text-neutral-400'"
            @click="switchView(item.key)"
          >
            <component :is="item.icon" class="h-4 w-4" />
            {{ item.shortLabel }}
          </button>
        </div>
        <button
          class="mt-2 flex w-full h-9 items-center justify-center gap-1.5 rounded-md bg-[#E31837]/10 text-xs font-bold uppercase tracking-wider text-[#E31837] hover:bg-[#E31837]/20"
          @click="handleLogout"
        >
          Đăng xuất
        </button>
      </div>

      <main class="flex-1 overflow-y-auto p-4 md:p-6" :data-route-name="String(route.name ?? '')">
        <div v-if="dashboardError" class="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div>
            <p class="text-sm font-black">Dữ liệu điều hành chưa được đồng bộ</p>
            <p class="mt-0.5 text-xs font-semibold">{{ dashboardError }}</p>
          </div>
          <button class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-black shadow-sm ring-1 ring-red-200" :disabled="isLoading" @click="loadDashboard">
            <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" /> Thử lại
          </button>
        </div>
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-if="Component" :key="String(route.name ?? '')" v-bind="routeViewProps" v-on="routeViewListeners" />
          <AdminRouteSkeleton v-else />
        </RouterView>
      </main>
    </div>

    <SosModal
      v-if="showSosModal"
      :hospitals="hospitals"
      :default-hospital-id="selectedHospitalId"
      :error-message="sosSubmitError"
      :submitting="isSubmittingSos"
      @close="showSosModal = false"
      @submit="submitSos"
    />
  </div>
  <AdminToastViewport />
  <AdminConfirmDialog />
  <AdminPromptDialog />
</template>
