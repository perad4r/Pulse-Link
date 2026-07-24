<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@lucide/vue'
import { useAdminUi, type ToastTone } from '../composables/useAdminUi'

const { toasts, dismissToast } = useAdminUi()

const toneClass: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[4000] flex w-[min(92vw,390px)] flex-col gap-2" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl" :class="toneClass[toast.tone]" role="status">
        <CheckCircle2 v-if="toast.tone === 'success'" class="mt-0.5 h-5 w-5 shrink-0" />
        <XCircle v-else-if="toast.tone === 'error'" class="mt-0.5 h-5 w-5 shrink-0" />
        <AlertTriangle v-else-if="toast.tone === 'warning'" class="mt-0.5 h-5 w-5 shrink-0" />
        <Info v-else class="mt-0.5 h-5 w-5 shrink-0" />
        <p class="min-w-0 flex-1 text-sm font-bold leading-relaxed">{{ toast.message }}</p>
        <button class="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-black/5" aria-label="Đóng thông báo" @click="dismissToast(toast.id)">
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active { transition: all 180ms ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
