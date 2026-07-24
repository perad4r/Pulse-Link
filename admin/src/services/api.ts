export class ApiRequestError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errors = errors
  }
}

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number
  retry?: number
}

const DEFAULT_TIMEOUT_MS = 20_000

export async function apiFetch(input: RequestInfo | URL, options: ApiFetchOptions = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retry, ...init } = options
  const method = (init.method ?? 'GET').toUpperCase()
  const maxRetries = retry ?? (method === 'GET' ? 1 : 0)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    const headers = new Headers(init.headers ?? {})
    const token = localStorage.getItem('admin_token')
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')

    try {
      const response = await window.fetch(input, {
        ...init,
        headers,
        signal: init.signal ?? controller.signal,
      })
      if (response.status === 401 && token) {
        window.dispatchEvent(new CustomEvent('admin:session-expired'))
      }
      if (attempt < maxRetries && response.status >= 500) continue
      if (response.status >= 500) {
        window.dispatchEvent(new CustomEvent('admin:api-unavailable', { detail: { status: response.status } }))
      }
      return response
    } catch (error) {
      if (attempt < maxRetries && !(error instanceof DOMException && error.name === 'AbortError')) continue
      if (error instanceof DOMException && error.name === 'AbortError') {
        window.dispatchEvent(new CustomEvent('admin:api-unavailable', { detail: { status: 408 } }))
        throw new ApiRequestError('Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.', 408)
      }
      window.dispatchEvent(new CustomEvent('admin:api-unavailable', { detail: { status: 0 } }))
      throw error
    } finally {
      window.clearTimeout(timeout)
    }
  }

  throw new ApiRequestError('Không thể kết nối máy chủ.', 503)
}

export async function apiError(response: Response, fallback = 'Yêu cầu không hợp lệ.') {
  const payload = await response.json().catch(() => null) as {
    message?: string
    errors?: Record<string, string[]>
  } | null
  const firstFieldError = payload?.errors ? Object.values(payload.errors)[0]?.[0] : null
  return new ApiRequestError(firstFieldError ?? payload?.message ?? fallback, response.status, payload?.errors)
}

export async function requireOk(response: Response, fallback?: string) {
  if (!response.ok) throw await apiError(response, fallback)
  return response
}
