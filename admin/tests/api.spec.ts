import { describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../src/services/api'

describe('apiFetch', () => {
  it('gắn Bearer token và Accept cho mọi API request', async () => {
    localStorage.setItem('admin_token', 'token-test')
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/admin/dashboard', { retry: 0 })

    const requestInit = fetchMock.mock.calls[0]?.[1]
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Authorization')).toBe('Bearer token-test')
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('phát tín hiệu hết phiên khi API trả 401', async () => {
    localStorage.setItem('admin_token', 'expired-token')
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
    const listener = vi.fn()
    window.addEventListener('admin:session-expired', listener)

    await apiFetch('/api/admin/dashboard', { retry: 0 })

    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('admin:session-expired', listener)
  })

  it('tự thử lại một lần với GET khi máy chủ lỗi 5xx', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))

    const response = await apiFetch('/api/admin/dashboard')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
