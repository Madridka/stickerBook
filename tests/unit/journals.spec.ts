import { describe, expect, it } from 'vitest'
import cards from '@/data/wc-26/catalog'
import { getJournalById, journals } from '@/features/journals/registry'
import type { HistoricalJournalDefinition } from '@/features/journals/types'
import { createDefaultJournalProgress } from '@/stores/journals'

const historyJournal = getJournalById(
  'tomsk-football-history',
) as HistoricalJournalDefinition

describe('journal registry', () => {
  it('содержит WC-26 и исторический журнал', () => {
    expect(journals.map(({ id }) => id)).toEqual(['wc-26', 'tomsk-football-history'])
  })

  it('описывает четыре разворота по шесть заранее вклеенных карточек', () => {
    expect(historyJournal.spreads).toHaveLength(4)
    expect(historyJournal.isPreUnlocked).toBe(true)
    expect(historyJournal.isPrePlaced).toBe(true)

    historyJournal.spreads.forEach((spread) => {
      expect(spread.leftPage.cards).toHaveLength(3)
      expect(spread.rightPage.cards).toHaveLength(3)
      expect([
        ...spread.leftPage.cards.map(({ position }) => position),
        ...spread.rightPage.cards.map(({ position }) => position),
      ]).toEqual([
        'top',
        'bottom-left',
        'bottom-right',
        'top',
        'bottom-left',
        'bottom-right',
      ])
    })

    expect(Object.keys(historyJournal.players)).toHaveLength(24)
  })

  it('не добавляет исторические карточки в каталог и пул WC-26', () => {
    const wcCardIds = new Set(cards.map(({ id }) => id))
    expect(Object.keys(historyJournal.players).some((id) => wcCardIds.has(id))).toBe(false)
  })

  it('создаёт независимое состояние прогресса для каждого журнала', () => {
    const wcProgress = createDefaultJournalProgress('wc-26')
    const historyProgress = createDefaultJournalProgress('tomsk-football-history')

    expect(wcProgress.journalId).toBe('wc-26')
    expect(wcProgress.unlockedEraIds).toEqual([])
    expect(historyProgress.journalId).toBe('tomsk-football-history')
    expect(historyProgress.unlockedEraIds).toHaveLength(4)
    expect(historyProgress.viewedPlayerIds).not.toBe(wcProgress.viewedPlayerIds)
  })

  it('безопасно возвращает undefined для неизвестного журнала', () => {
    expect(getJournalById('unknown-journal')).toBeUndefined()
  })
})
