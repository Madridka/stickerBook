export type ClientErrorKind =
  | 'api-error'
  | 'runtime-error'
  | 'unhandled-rejection'
  | 'vue-error'

export interface ClientErrorContext {
  detail?: string
  source: string
}

export type ClientEventName =
  | 'card.placed'
  | 'daily-task.reward-claimed'
  | 'duplicate-exchange.claimed'
  | 'minigame.reward-claimed'
  | 'pack.opened'
  | 'pack.purchased'
  | 'pick.claimed'

export interface ClientEventDetails {
  albumId?: string
  cardId?: string
  count?: number
  packId?: string
  value?: number
}

interface ClientErrorPayload {
  detail?: string
  kind: ClientErrorKind
  message: string
  name?: string
  route: string
  source: string
  stack?: string
  userAgent: string
}

const DUPLICATE_WINDOW_MS: number = 30_000
const recentReports: Map<string, number> = new Map()

const truncate = (value: string, maximumLength: number): string =>
  value.length <= maximumLength ? value : value.slice(0, maximumLength)

const describeError = (error: unknown): Pick<ClientErrorPayload, 'message' | 'name' | 'stack'> => {
  if (error instanceof Error) {
    return {
      message: truncate(error.message || 'Unknown client error', 1_000),
      name: truncate(error.name, 128),
      stack: error.stack ? truncate(error.stack, 8_000) : undefined,
    }
  }
  if (typeof error === 'string') return { message: truncate(error, 1_000) }

  return { message: 'Unknown client error' }
}

const shouldReport = (fingerprint: string, now: number): boolean => {
  const lastReportedAt: number | undefined = recentReports.get(fingerprint)
  recentReports.set(fingerprint, now)
  for (const [key, reportedAt] of recentReports) {
    if (reportedAt + DUPLICATE_WINDOW_MS <= now) recentReports.delete(key)
  }
  return lastReportedAt === undefined || lastReportedAt + DUPLICATE_WINDOW_MS <= now
}

const sendLog = (path: string, payload: object): void => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return
  try {
    void fetch(path, {
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    }).catch((): undefined => undefined)
  } catch {
    // Диагностика не должна влиять на игровое действие, которое она описывает.
  }
}

export const reportClientEvent = (
  event: ClientEventName,
  details: ClientEventDetails = {},
): void => {
  if (typeof window === 'undefined') return
  sendLog('/api/client-events', {
    ...details,
    event,
    route: truncate(window.location.pathname, 512),
  })
}

export const reportClientError = (
  kind: ClientErrorKind,
  error: unknown,
  context: ClientErrorContext,
): void => {
  if (typeof window === 'undefined') return
  const description = describeError(error)
  const fingerprint: string = `${kind}:${context.source}:${description.name ?? ''}:${description.message}`
  if (!shouldReport(fingerprint, Date.now())) return

  const payload: ClientErrorPayload = {
    ...description,
    detail: context.detail ? truncate(context.detail, 512) : undefined,
    kind,
    route: truncate(window.location.pathname, 512),
    source: truncate(context.source, 128),
    userAgent: truncate(window.navigator.userAgent, 512),
  }

  sendLog('/api/client-errors', payload)
}
