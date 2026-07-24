<script setup lang="ts">
import { FilePenLine, X } from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'
import { useAdminUi } from '../composables/useAdminUi'

const { promptRequest, resolvePrompt } = useAdminUi()
const value = ref('')
const input = ref<HTMLTextAreaElement | null>(null)

watch(promptRequest, (request) => {
  if (!request) return
  value.value = request.initialValue
  void nextTick(() => input.value?.focus())
})

function submit() {
  if (promptRequest.value?.required && !value.value.trim()) return
  resolvePrompt(value.value.trim())
}
</script>

<template>
  <Teleport to="body">
    <div v-if="promptRequest" class="fixed inset-0 z-[3950] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" @click.self="resolvePrompt(null)" @keydown.esc="resolvePrompt(null)">
      <form class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="admin-prompt-title" @submit.prevent="submit">
        <div class="flex items-start gap-3">
          <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><FilePenLine class="h-5 w-5" /></div>
          <div class="min-w-0 flex-1">
            <h2 id="admin-prompt-title" class="text-base font-black text-slate-950">{{ promptRequest.title }}</h2>
            <p class="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{{ promptRequest.message }}</p>
          </div>
          <button type="button" class="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100" aria-label="Đóng" @click="resolvePrompt(null)"><X class="h-4 w-4" /></button>
        </div>
        <label class="mt-5 block">
          <span class="text-xs font-black uppercase tracking-wide text-slate-600">{{ promptRequest.label }}</span>
          <textarea ref="input" v-model="value" rows="4" :placeholder="promptRequest.placeholder" :required="promptRequest.required" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600 hover:bg-slate-50" @click="resolvePrompt(null)">Quay lại</button>
          <button type="submit" class="h-10 rounded-lg bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50" :disabled="promptRequest.required && !value.trim()">{{ promptRequest.confirmLabel }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
