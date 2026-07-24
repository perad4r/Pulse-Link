import { defineComponent, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { parsePositiveInteger, useRouteQueryState } from '../src/composables/useRouteQueryState'

describe('useRouteQueryState', () => {
  it('khôi phục filter/page từ URL và ghi thay đổi ngược lại URL', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/list', component: { template: '<div />' } }],
    })
    await router.push('/list?status=draft&page=3')

    const component = defineComponent({
      setup() {
        const status = ref('')
        const page = ref(1)
        useRouteQueryState({
          status: { source: status, defaultValue: '' },
          page: { source: page, defaultValue: 1, parse: (value) => parsePositiveInteger(value), serialize: String },
        })
        return { status, page }
      },
      template: '<div>{{ status }}-{{ page }}</div>',
    })
    const wrapper = mount(component, { global: { plugins: [router] } })
    await nextTick()
    await flushPromises()
    expect(wrapper.text()).toBe('draft-3')

    wrapper.vm.status = 'published'
    wrapper.vm.page = 2
    await nextTick()
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ status: 'published', page: '2' })
  })
})
