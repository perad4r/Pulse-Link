import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function prepareEmptyAdminDashboard(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('admin_token', 'e2e-token')
    localStorage.setItem('admin_user', JSON.stringify({
      id: 1,
      name: 'System Admin',
      email: 'system@pulselink.test',
      role: 'system_admin',
      hospital_id: null,
      permissions: [],
    }))
  })
  await page.route('**/api/admin/dashboard**', async (route) => {
    await route.fulfill({ json: {
      data: {
        hospitals: [{
          id: 12,
          name: 'Bệnh viện E2E',
          code: 'E2E',
          address: 'Hà Nội',
          province_code: '01',
          ward_code: null,
          latitude: 21.02,
          longitude: 105.84,
          is_active: true,
          province: { code: '01', full_name: 'Hà Nội' },
        }],
        stats: {
          active_alerts: 0,
          notified_donors: 0,
          committed_donors: 0,
          donated_donors: 0,
          upcoming_events: 0,
          scheduled_appointments: 0,
          completed_appointments: 0,
          verified_volume_ml: 0,
        },
        alerts: [],
        commitments: [],
        current_admin: {
          id: 1,
          name: 'System Admin',
          email: 'system@pulselink.test',
          role: 'system_admin',
          hospital_id: null,
          permissions: [],
          scope_label: 'Toàn hệ thống',
        },
      },
    } })
  })
  await page.route('**/api/locations/**', async (route) => {
    await route.fulfill({ json: { data: [] } })
  })
}

test('deep-link chưa đăng nhập được giữ lại trong redirect', async ({ page }) => {
  await page.goto('/inventory?tab=forecast&hospital=12')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await expect(page.getByRole('heading', { name: /PULSE/i })).toBeVisible()
})

test('màn đăng nhập không có lỗi accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
  expect(seriousViolations).toEqual([])
})

test('reload giữ nguyên màn, tab và bệnh viện đã chọn', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('admin_token', 'e2e-token')
    localStorage.setItem('admin_user', JSON.stringify({
      id: 1,
      name: 'System Admin',
      email: 'system@pulselink.test',
      role: 'system_admin',
      hospital_id: null,
      permissions: [],
    }))
  })
  await page.route('**/api/admin/dashboard**', async (route) => {
    await route.fulfill({ json: {
      data: {
        hospitals: [{ id: 12, name: 'Bệnh viện E2E', code: 'E2E', address: 'Hà Nội', province_code: '01', ward_code: null, latitude: 21.02, longitude: 105.84, is_active: true, province: { code: '01', full_name: 'Hà Nội' } }],
        stats: { active_alerts: 0, notified_donors: 0, committed_donors: 0, donated_donors: 0, upcoming_events: 0, scheduled_appointments: 0, completed_appointments: 0, verified_volume_ml: 0 },
        alerts: [],
        commitments: [],
        current_admin: { id: 1, name: 'System Admin', email: 'system@pulselink.test', role: 'system_admin', hospital_id: null, permissions: [], scope_label: 'Toàn hệ thống' },
      },
    } })
  })
  await page.route('**/api/locations/**', async (route) => route.fulfill({ json: { data: [] } }))
  await page.route('**/api/admin/blood-stocks?**', async (route) => route.fulfill({ json: { data: { bags: { data: [], last_page: 1 }, stats: {}, breakdown: [], recent_movements: [] } } }))
  await page.route('**/api/admin/blood-stocks/thresholds**', async (route) => route.fulfill({ json: { data: [] } }))
  await page.route('**/api/admin/blood-forecasts/overview**', async (route) => route.fulfill({ json: { data: null } }))
  await page.route('**/api/admin/blood-stocks/alerts**', async (route) => route.fulfill({ json: { data: [] } }))
  await page.route('**/api/admin/blood-stocks/reports**', async (route) => route.fulfill({ json: { data: {} } }))
  await page.route('**/api/admin/hospitals**', async (route) => route.fulfill({ json: { data: [] } }))

  await page.goto('/inventory?hospital=12&tab=forecast')
  await expect(page).toHaveURL(/\/inventory\?hospital=12&tab=forecast/)
  await expect(page.locator('main')).toHaveAttribute('data-route-name', 'inventory')
  await expect(page.getByText('Dự báo nhu cầu máu trong 30 ngày tới')).toBeVisible()
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).first().click()
  await expect(page).toHaveURL(/\/dashboard\?hospital=12/)
  await page.goBack()
  await expect(page).toHaveURL(/\/inventory\?hospital=12&tab=forecast/)
  await expect(page.getByText('Dự báo nhu cầu máu trong 30 ngày tới')).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/\/inventory\?hospital=12&tab=forecast/)
  await expect(page.getByText('Dự báo nhu cầu máu trong 30 ngày tới')).toBeVisible()
})

test('nút phát lệnh trong màn SOS mở biểu mẫu khẩn cấp', async ({ page }) => {
  await prepareEmptyAdminDashboard(page)

  await page.goto('/sos?hospital=12')
  await page.getByRole('button', { name: 'Phát lệnh SOS khẩn cấp' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Phát lệnh SOS khẩn cấp' })).toBeVisible()
})

test('sidebar thu gọn được và bản đồ SOS luôn còn trên mọi kích thước', async ({ page }) => {
  await prepareEmptyAdminDashboard(page)
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.goto('/sos?hospital=12')

  const sidebar = page.locator('aside[data-sidebar-collapsed]')
  await expect(sidebar).toHaveAttribute('data-sidebar-collapsed', 'false')
  await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click()
  await expect(sidebar).toHaveAttribute('data-sidebar-collapsed', 'true')

  await page.reload()
  await expect(sidebar).toHaveAttribute('data-sidebar-collapsed', 'true')

  const map = page.locator('.leaflet-container')
  for (const viewport of [
    { width: 1180, height: 820 },
    { width: 900, height: 760 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(map).toBeVisible()
    const size = await map.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
    expect(size.width).toBeGreaterThan(300)
    expect(size.height).toBeGreaterThanOrEqual(350)
  }
})
