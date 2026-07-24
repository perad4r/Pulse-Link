<script setup lang="ts">
import { ArrowLeft, ShieldX } from '@lucide/vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="grid min-h-[65vh] place-items-center px-4">
    <div class="max-w-md text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-[#E31837]">
        <ShieldX class="h-8 w-8" />
      </div>
      <p class="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#E31837]">403 · Phân quyền</p>
      <h1 class="mt-2 text-2xl font-black text-slate-950">Bạn chưa có quyền mở màn này</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-500">Hãy liên hệ quản trị hệ thống nếu phạm vi công việc của bạn cần quyền truy cập này.</p>
      <button class="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white" @click="router.push({ name: 'dashboard' })">
        <ArrowLeft class="h-4 w-4" /> Về tổng quan
      </button>
    </div>
  </section>
</template>
