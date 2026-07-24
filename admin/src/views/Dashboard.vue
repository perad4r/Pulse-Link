<script setup lang="ts">
import { computed } from 'vue'
import { Activity, AlertTriangle, CalendarCheck2, CalendarRange, CheckCircle2, CheckSquare2, ChevronRight, Droplet, Route, Send, Users } from '@lucide/vue'
import type { DashboardStats, EmergencyAlert, EmergencyCommitment } from '../types'
import InventoryForecastSummary from '../components/InventoryForecastSummary.vue'
import AdminEmptyState from '../components/AdminEmptyState.vue'

const props = defineProps<{
  stats: DashboardStats
  activeAlerts: EmergencyAlert[]
  commitments: EmergencyCommitment[]
  isLoading: boolean
  apiBaseUrl: string
  selectedHospitalId: number | null
}>()

const emit = defineEmits<{
  openSos: []
  openSosView: []
  openInventory: []
  openEvents: []
}>()

const enRouteCommitments = computed(() =>
  props.commitments.filter((commitment) => commitment.status === 'en_route'),
)
const donatedCommitments = computed(() => props.commitments.filter((commitment) => commitment.status === 'donated'))
const latestAlerts = computed(() => props.activeAlerts.slice(0, 3))

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat('vi-VN').format(value ?? 0)
}

function formatVolume(value: number | undefined) {
  return `${formatNumber(value)} ml`
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.24em] text-[#E31837]">Trung tâm điều hành</p>
        <h2 class="mt-2 text-2xl font-black tracking-tight text-slate-950">Tổng quan vận hành Mạch Sống</h2>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          Theo dõi lịch hiến thường quy, lượt đặt lịch, dữ liệu hoàn tất và phản ứng SOS theo thời gian thực.
        </p>
      </div>

      <button
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#E31837] px-4 text-xs font-black uppercase tracking-wide text-white shadow-sm shadow-red-500/20 transition hover:bg-red-700 active:scale-[0.98]"
        @click="emit('openSos')"
      >
        <AlertTriangle class="h-4 w-4" />
        Phát lệnh SOS
      </button>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <button
        type="button"
        class="rounded-lg border border-red-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-100"
        @click="emit('openSosView')"
      >
        <div class="flex items-center justify-between">
          <div class="grid h-11 w-11 place-items-center rounded-md bg-red-50 text-[#E31837]">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <span class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black uppercase text-[#E31837]">
            {{ isLoading ? 'Đang đồng bộ' : 'Trực tuyến' }}
          </span>
        </div>
        <p class="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">SOS đang hoạt động</p>
        <div class="mt-1 flex items-end gap-2">
          <strong class="text-3xl font-black text-slate-950">{{ activeAlerts.length }}</strong>
          <span class="pb-1 text-xs font-bold text-red-600">ca báo động đỏ</span>
        </div>
      </button>

      <button type="button" class="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md" @click="emit('openEvents')">
        <div class="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-600">
          <CalendarRange class="h-5 w-5" />
        </div>
        <p class="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Lịch hiến sắp tới</p>
        <div class="mt-1 flex items-end gap-2">
          <strong class="text-3xl font-black text-slate-950">{{ formatNumber(stats.upcoming_events) }}</strong>
          <span class="pb-1 text-xs font-bold text-blue-600">sự kiện</span>
        </div>
      </button>

      <button type="button" class="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md" @click="emit('openEvents')">
        <div class="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-emerald-600">
          <CalendarCheck2 class="h-5 w-5" />
        </div>
        <p class="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Lượt đặt lịch</p>
        <div class="mt-1 flex items-end gap-2">
          <strong class="text-3xl font-black text-slate-950">{{ formatNumber(stats.scheduled_appointments) }}</strong>
          <span class="pb-1 text-xs font-bold text-emerald-600">đang chờ</span>
        </div>
      </button>

      <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-700">
          <CheckCircle2 class="h-5 w-5" />
        </div>
        <p class="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Đã hoàn tất</p>
        <div class="mt-1 flex items-end gap-2">
          <strong class="text-3xl font-black text-slate-950">{{ formatNumber(stats.completed_appointments) }}</strong>
          <span class="pb-1 text-xs font-bold text-slate-500">lượt</span>
        </div>
      </article>

      <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid h-11 w-11 place-items-center rounded-md bg-red-50 text-[#E31837]">
          <Droplet class="h-5 w-5" />
        </div>
        <p class="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Máu ghi nhận</p>
        <div class="mt-1 flex items-end gap-2">
          <strong class="text-2xl font-black text-slate-950">{{ formatVolume(stats.verified_volume_ml) }}</strong>
        </div>
      </article>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="flex items-center gap-2 text-base font-black text-slate-950"><CheckSquare2 class="h-5 w-5 text-[#E31837]" /> Việc cần ưu tiên hôm nay</h3>
          <p class="mt-1 text-sm font-semibold text-slate-500">Đi thẳng tới luồng cần xử lý, không phải tìm lại trong menu.</p>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{{ activeAlerts.length + (enRouteCommitments.length ? 1 : 0) + (stats.scheduled_appointments ? 1 : 0) }} việc</span>
      </div>
      <div class="mt-4 grid gap-3 lg:grid-cols-3">
        <button class="flex items-center gap-3 rounded-lg border p-3 text-left transition hover:shadow-sm" :class="activeAlerts.length ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'" @click="emit('openSosView')">
          <span class="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#E31837]"><AlertTriangle class="h-4 w-4" /></span>
          <span class="min-w-0 flex-1"><span class="block text-sm font-black text-slate-900">Điều phối {{ activeAlerts.length }} ca SOS</span><span class="block text-xs font-semibold text-slate-500">{{ enRouteCommitments.length }} người đang di chuyển</span></span>
          <ChevronRight class="h-4 w-4 text-slate-400" />
        </button>
        <button class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:shadow-sm" @click="emit('openEvents')">
          <span class="grid h-9 w-9 place-items-center rounded-lg bg-white text-blue-600"><CalendarCheck2 class="h-4 w-4" /></span>
          <span class="min-w-0 flex-1"><span class="block text-sm font-black text-slate-900">Xử lý lượt đặt lịch</span><span class="block text-xs font-semibold text-slate-500">{{ formatNumber(stats.scheduled_appointments) }} lượt đang chờ</span></span>
          <ChevronRight class="h-4 w-4 text-slate-400" />
        </button>
        <button class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-purple-200 hover:shadow-sm" @click="emit('openInventory')">
          <span class="grid h-9 w-9 place-items-center rounded-lg bg-white text-purple-600"><Droplet class="h-4 w-4" /></span>
          <span class="min-w-0 flex-1"><span class="block text-sm font-black text-slate-900">Kiểm tra kho & dự báo</span><span class="block text-xs font-semibold text-slate-500">Đánh giá cảnh báo thiếu hụt</span></span>
          <ChevronRight class="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </section>

    <InventoryForecastSummary
      :api-base-url="apiBaseUrl"
      :hospital-id="selectedHospitalId"
      @open-inventory="emit('openInventory')"
    />

    <section class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="flex items-center gap-2 text-base font-black text-slate-950">
              <Activity class="h-5 w-5 text-[#E31837]" />
              Trạng thái SOS thời gian thực
            </h3>
            <p class="mt-1 text-sm text-slate-500">Các ca báo động đỏ đang được điều phối qua Reverb và Firebase.</p>
          </div>
          <div class="rounded-md bg-slate-50 px-3 py-2 text-right">
            <p class="text-xs font-bold uppercase text-slate-400">Đã thông báo</p>
            <p class="text-lg font-black text-slate-950">{{ formatNumber(stats.notified_donors) }} người</p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-3">
          <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p class="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Đã cam kết</p>
            <p class="mt-2 text-3xl font-black text-slate-950">{{ formatNumber(stats.committed_donors) }}</p>
          </div>
          <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p class="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Đang di chuyển</p>
            <p class="mt-2 text-3xl font-black text-[#E31837]">{{ enRouteCommitments.length }}</p>
          </div>
          <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p class="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Đã hiến SOS</p>
            <p class="mt-2 text-3xl font-black text-emerald-600">{{ donatedCommitments.length }}</p>
          </div>
        </div>

        <div class="mt-5 space-y-3">
          <article
            v-for="alert in latestAlerts"
            :key="alert.id"
            class="rounded-lg border border-red-100 bg-red-50 p-4"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-black text-slate-950">{{ alert.hospital?.name }}</p>
                <p class="mt-1 text-xs font-semibold text-red-700">
                  Cần {{ alert.units_needed }} đơn vị nhóm {{ alert.required_blood_type }} · {{ alert.level.toUpperCase() }}
                </p>
              </div>
              <span class="rounded-full bg-[#E31837] px-3 py-1 text-xs font-black uppercase text-white">
                Đang điều phối
              </span>
            </div>
            <p class="mt-3 text-sm text-slate-700">{{ alert.message }}</p>
          </article>
          <AdminEmptyState v-if="latestAlerts.length === 0" compact title="Không có ca SOS đang hoạt động" description="Hệ thống an toàn và sẵn sàng tiếp nhận yêu cầu điều phối mới." />
        </div>
      </article>

      <aside class="space-y-4">
        <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="flex items-center gap-2 text-base font-black text-slate-950">
            <Route class="h-5 w-5 text-[#E31837]" />
            Dòng cam kết mới
          </h3>
          <div class="mt-4 space-y-3">
            <div
              v-for="commitment in enRouteCommitments.slice(0, 5)"
              :key="commitment.id"
              class="rounded-md border border-slate-100 bg-slate-50 p-3"
            >
              <div class="flex items-center justify-between">
                <p class="font-black text-slate-900">{{ commitment.donor?.name ?? 'Tình nguyện viên' }}</p>
                <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black uppercase text-emerald-700">
                  {{ commitment.status === 'en_route' ? 'Đang di chuyển' : 'Đã cam kết' }}
                </span>
              </div>
              <p class="mt-1 text-xs font-semibold text-slate-500">
                {{ commitment.donor?.blood_type ?? '--' }} · Dự kiến {{ commitment.eta_minutes ?? '--' }} phút
              </p>
            </div>
            <AdminEmptyState v-if="enRouteCommitments.length === 0" compact title="Chưa có người hiến đang di chuyển" description="Cam kết mới sẽ xuất hiện tại đây theo thời gian thực." />
          </div>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="flex items-center gap-2 text-base font-black text-slate-950">
            <Users class="h-5 w-5 text-[#E31837]" />
            Nhịp vận hành hôm nay
          </h3>
          <div class="mt-4 space-y-3 text-sm text-slate-600">
            <div class="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span>Tình nguyện viên đã được thông báo</span>
              <strong class="text-slate-950">{{ formatNumber(stats.notified_donors) }}</strong>
            </div>
            <div class="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span>Cam kết đến hiến khẩn cấp</span>
              <strong class="text-slate-950">{{ formatNumber(stats.committed_donors) }}</strong>
            </div>
            <div class="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span>Lượt hoàn tất đã xác minh</span>
              <strong class="text-slate-950">{{ formatNumber(stats.completed_appointments) }}</strong>
            </div>
          </div>
          <button
            class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-[#E31837] hover:bg-red-100"
            @click="emit('openSos')"
          >
            <Send class="h-4 w-4" />
            Kích hoạt yêu cầu SOS mới
          </button>
        </article>
      </aside>
    </section>
  </div>
</template>
