import { SERVER_SYNC_CONFIG } from '@/config/runtimeConfig'

export interface ApiErrorBody {
  code?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.code ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController()
  const abortRequest = (): void => controller.abort(init?.signal?.reason)
  const timeoutId = window.setTimeout(
    (): void => controller.abort(),
    SERVER_SYNC_CONFIG.requestTimeoutMs,
  )

  if (init?.signal?.aborted) abortRequest()
  else init?.signal?.addEventListener('abort', abortRequest, { once: true })

  try {
    const response: Response = await fetch(path, {
      ...init,
      signal: controller.signal,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
    if (response.status === 204) return undefined as T
    const body: unknown = await response.json().catch((): null => null)
    if (!response.ok) {
      throw new ApiError(
        response.status,
        body && typeof body === 'object' ? (body as ApiErrorBody) : {},
      )
    }
    return body as T
  } finally {
    window.clearTimeout(timeoutId)
    init?.signal?.removeEventListener('abort', abortRequest)
  }
}
