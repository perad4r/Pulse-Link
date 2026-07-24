<template>
  <div class="animate-pulse space-y-5" aria-label="Đang tải màn hình" role="status">
    <div class="space-y-2">
      <div class="h-3 w-28 rounded bg-slate-200" />
      <div class="h-7 w-72 max-w-full rounded bg-slate-200" />
      <div class="h-4 w-[32rem] max-w-full rounded bg-slate-100" />
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="index in 4" :key="index" class="h-36 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"><div class="h-full rounded-lg bg-slate-100" /></div>
    </div>
    <div class="h-80 rounded-xl border border-slate-100 bg-white p-5 shadow-sm"><div class="h-full rounded-lg bg-slate-100" /></div>
    <span class="sr-only">Đang tải dữ liệu và giao diện…</span>
  </div>
</template>
