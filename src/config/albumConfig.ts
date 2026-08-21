/** Видимость журналов в общей библиотеке. */
export const ALBUM_VISIBILITY_CONFIG: Record<string, boolean> = {
  info: true,
  'wc-26': true,
  tomsk: true,
  'ucl-26-27': true,
  spainClubsLogo: true,
  russiaClubsLogo: true,
  englandClubsLogo: true,
}

/** Настройки содержимого, навигации и адаптивного режима журнала. */
export const ALBUM_VIEW_CONFIG = {
  recentReleaseCount: 3,
  releaseItemsPerNote: 2,
  contentsPageSize: 12,
  contentsFirstPage: 4,
  contentsLastPage: 7,
  desktopSpreadMediaQuery: '(min-width: 1024px)',
  pageTurnDurationMs: 520,
  trayFocusDurationMs: 3_500,
  collectionTargetFocusDurationMs: 7_000,
}

/** Показывает весь каталог как вклеенный, не изменяя данные игрока. */
export const PLACE_ALL_COLLECTED_CARDS: boolean = true
