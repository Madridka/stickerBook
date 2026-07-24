import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import HistoricalJournalPage from '@/components/Album/HistoricalJournalPage.vue'
import { getJournalById } from '@/features/journals/registry'
import type { HistoricalJournalDefinition } from '@/features/journals/types'

const journal = getJournalById('tomsk-football-history') as HistoricalJournalDefinition
const spread = journal.spreads[0]

const mountPage = () =>
  mount(HistoricalJournalPage, {
    props: {
      page: spread.leftPage,
      eraTitle: spread.title,
      eraSubtitle: spread.subtitle,
      players: journal.players,
    },
    global: {
      plugins: [i18n],
    },
  })

describe('HistoricalJournalPage', () => {
  it('раскладывает три вклеенные карточки по схеме один плюс два', () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('[data-historical-card]')).toHaveLength(3)
    expect(
      wrapper.findAll('[data-card-position]').map((card) => card.attributes('data-card-position')),
    ).toEqual(['top', 'bottom-left', 'bottom-right'])
    expect(wrapper.text().match(/Вклеено/g)).toHaveLength(3)
  })

  it('передаёт выбранного игрока при клике по карточке', async () => {
    const wrapper = mountPage()
    await wrapper.get('[data-historical-card="surovtsev"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ playerId: 'surovtsev' })
  })
})
