import type { PlayerCard } from '@/types'

// Выбирает один элемент пропорционально его положительному весу
export const weightedRandom = (cards: PlayerCard[]): PlayerCard => {
  const availableCards: PlayerCard[] = cards.filter(({ weight }) => weight > 0)
  const totalWeight: number = availableCards.reduce((total, { weight }) => total + weight, 0)
  let cursor: number = Math.random() * totalWeight

  for (const card of availableCards) {
    cursor -= card.weight
    if (cursor < 0) return card
  }

  return availableCards[availableCards.length - 1] ?? cards[0]
}
