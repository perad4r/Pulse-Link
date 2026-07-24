<script setup lang="ts">
import { Inbox } from '@lucide/vue'

withDefaults(defineProps<{
  title: string
  description: string
  compact?: boolean
}>(), { compact: false })
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center" :class="compact ? 'py-5' : 'py-9'">
    <div class="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><Inbox class="h-5 w-5" /></div>
    <p class="mt-3 text-sm font-black text-slate-700">{{ title }}</p>
    <p class="mt-1 max-w-md text-xs font-semibold leading-relaxed text-slate-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4"><slot /></div>
  </div>
</template>
