/** Интервалы визуальных эффектов и обновления главного экрана. */
export const HOME_VIEW_CONFIG = {
  clickEffectDurationMs: 700,
  energyRefreshIntervalMs: 1_000,
  completionNoticeDurationMs: 4_500,
}

/** Общая частота обновления экранных таймеров и календарных состояний. */
export const CLOCK_CONFIG = {
  refreshIntervalMs: 1_000,
}

/** Сетевые интервалы API и синхронизации серверного сохранения. */
export const SERVER_SYNC_CONFIG = {
  requestTimeoutMs: 10_000,
  saveDebounceMs: 600,
  pollIntervalMs: 15_000,
}

/** Тайминги анимации открытия пака. */
export const PACK_ANIMATION_CONFIG = {
  stepCount: 3,
  stepIntervalMs: 850,
  completionDelayMs: 450,
}
