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
  saveDebounceMs: 2_000,
  saveMaxWaitMs: 10_000,
  maxRetryDelayMs: 30_000,
  pollIntervalMs: 15_000,
}

/** Техническая частота пересчёта и HTTP-кэширования публичного рейтинга. */
export const LEADERBOARD_RUNTIME_CONFIG = {
  cacheTtlMs: 60 * 60 * 1_000,
  staleWhileRevalidateSeconds: 60,
} as const

/** Настройки экрана авторизации и локального гостевого режима. */
export const AUTH_UI_CONFIG = {
  guestModeStorageKey: 'sticker-book-guest-mode',
  authenticatedUserStorageKey: 'sticker-book-authenticated-user',
  showLocalSaveJson: false,
}

/** Тайминги анимации открытия пака. */
export const PACK_ANIMATION_CONFIG = {
  stepCount: 3,
  stepIntervalMs: 850,
  completionDelayMs: 450,
}
