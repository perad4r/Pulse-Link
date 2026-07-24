import { nextTick, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface RouteQueryField<T> {
  source: Ref<T>
  defaultValue: T
  parse?: (value: string | null) => T
  serialize?: (value: T) => string
}

type RouteQueryFields = Record<string, RouteQueryField<unknown>>

export function useRouteQueryState(fields: RouteQueryFields) {
  const route = useRoute()
  const router = useRouter()
  const syncingFromRoute = ref(false)
  const entries = Object.entries(fields)

  function parsedValue(field: RouteQueryField<unknown>, raw: unknown) {
    const value = typeof raw === 'string' ? raw : null
    return field.parse ? field.parse(value) : value ?? field.defaultValue
  }

  function serializedValue(field: RouteQueryField<unknown>) {
    return field.serialize ? field.serialize(field.source.value) : String(field.source.value)
  }

  function applyRouteQuery() {
    const updates = entries.map(([key, field]) => [field, parsedValue(field, route.query[key])] as const)
    if (updates.every(([field, value]) => Object.is(field.source.value, value))) return
    syncingFromRoute.value = true
    for (const [field, value] of updates) field.source.value = value
    void nextTick(() => { syncingFromRoute.value = false })
  }

  async function syncRouteQuery() {
    if (syncingFromRoute.value) return
    const query = { ...route.query }
    for (const [key, field] of entries) {
      if (Object.is(field.source.value, field.defaultValue) || field.source.value === '') delete query[key]
      else query[key] = serializedValue(field)
    }
    await router.replace({ query })
  }

  watch(() => route.query, applyRouteQuery, { deep: true, immediate: true })
  watch(entries.map(([, field]) => field.source), () => { void syncRouteQuery() }, { flush: 'post' })

  return { syncingFromRoute, syncRouteQuery }
}

export function parsePositiveInteger(value: string | null, fallback = 1) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}
