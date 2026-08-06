import type { CardCatalogConfig } from '@/types/gameConfig'

/** Метаданные основной коллекции, используемые при проверке каталогов команд. */
export const COLLECTION_CONFIG = {
  id: 'wc-26',
  expectedTeamCount: 48,
  baseAlbumSlotsPerTeam: 20,
}

/** Справочники и значения по умолчанию схемы каталога карточек. */
export const CARD_CATALOG_CONFIG: CardCatalogConfig = {
  schemaVersion: 2,
  kinds: ['team', 'coach', 'player', 'special'],
  positions: ['GK', 'DF', 'MF', 'FW'],
  coachRoles: ['HEAD_COACH'],
  rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
  series: ['base', 'special', 'moment', 'legend'],
  finishes: ['standard', 'foil', 'holographic'],
  defaults: {
    rarity: 'common',
    series: 'base',
    finish: 'standard',
    selectionWeight: 1,
  },
}
