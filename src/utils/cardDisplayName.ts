import type { CardDefinition } from '@/types'

/** Добавляет краткую игровую позицию только к карточкам футболистов. */
export const formatCardDisplayName = (card: CardDefinition): string =>
  card.kind === 'player' ? `${card.displayName} · ${card.position}` : card.displayName
