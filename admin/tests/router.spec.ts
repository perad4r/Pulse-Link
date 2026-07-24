import { beforeEach, describe, expect, it } from 'vitest'
import router from '../src/router'

const systemAdmin = {
  id: 1,
  name: 'System Admin',
  email: 'system@pulselink.test',
  role: 'system_admin',
  hospital_id: null,
  permissions: [],
}

describe('admin router', () => {
  beforeEach(async () => {
    localStorage.clear()
    await router.replace('/login')
  })

  it('giữ deep-link làm redirect khi chưa đăng nhập', async () => {
    await router.push('/inventory?tab=forecast&hospital=12')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/inventory?tab=forecast&hospital=12')
  })

  it('mở đúng màn và query khi đã đăng nhập', async () => {
    localStorage.setItem('admin_token', 'token')
    localStorage.setItem('admin_user', JSON.stringify(systemAdmin))
    await router.push('/inventory?tab=forecast&hospital=12')
    expect(router.currentRoute.value.name).toBe('inventory')
    expect(router.currentRoute.value.query).toMatchObject({ tab: 'forecast', hospital: '12' })
  })

  it('chặn màn system admin đối với nhân viên bệnh viện', async () => {
    localStorage.setItem('admin_token', 'token')
    localStorage.setItem('admin_user', JSON.stringify({
      ...systemAdmin,
      role: 'hospital_staff',
      hospital_id: 2,
      permissions: ['dashboard.view'],
    }))
    await router.push('/settings/ai')
    expect(router.currentRoute.value.name).toBe('forbidden')
    expect(router.currentRoute.value.query.from).toBe('/settings/ai')
  })
})
