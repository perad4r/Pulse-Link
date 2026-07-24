<script setup lang="ts">
import { AlertTriangle, X } from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'
import { useAdminUi } from '../composables/useAdminUi'

const { confirmRequest, resolveConfirm } = useAdminUi()
const confirmButton = ref<HTMLButtonElement | null>(null)

watch(confirmRequest, (request) => {
  if (request) void nextTick(() => confirmButton.value?.focus())
})
</script>

<template>
  <Teleport to="body">
    <div v-if="confirmRequest" class="fixed inset-0 z-[3900] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" @click.self="resolveConfirm(false)" @keydown.esc="resolveConfirm(false)">
      <section class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-message">
        <div class="flex items-start gap-3">
          <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl" :class="confirmRequest.tone === 'danger' ? 'bg-red-50 text-[#E31837]' : 'bg-blue-50 text-blue-700'">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 id="admin-confirm-title" class="text-base font-black text-slate-950">{{ confirmRequest.title }}</h2>
            <p id="admin-confirm-message" class="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{{ confirmRequest.message }}</p>
          </div>
          <button class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100" aria-label="Đóng" @click="resolveConfirm(false)">
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600 hover:bg-slate-50" @click="resolveConfirm(false)">{{ confirmRequest.cancelLabel }}</button>
          <button ref="confirmButton" class="h-10 rounded-lg px-4 text-sm font-black text-white" :class="confirmRequest.tone === 'danger' ? 'bg-[#E31837] hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'" @click="resolveConfirm(true)">{{ confirmRequest.confirmLabel }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
