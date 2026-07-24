import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import GoalCard from '@/components/goals/GoalCard.vue'
import type { GoalRuntimeState } from '@/features/goals/types'

const createGoal = (status: GoalRuntimeState['status']): GoalRuntimeState => ({
  definition: {
    id: 'test-goal',
    category: 'packs',
    title: 'Открыть наборы',
    description: 'Описание',
    order: 1,
    requirements: [{ type: 'packs-opened', target: 5 }],
    reward: [{ type: 'coins', amount: 10 }],
    action: { label: 'Открыть', route: { name: 'shop' } },
  },
  status,
  progress: { current: status === 'active' ? 3 : 5, target: 5 },
  isRewardAvailable: status === 'completed',
})

const mountCard = (status: GoalRuntimeState['status']) =>
  mount(GoalCard, {
    props: { goal: createGoal(status) },
    global: {
      plugins: [i18n],
      stubs: {
        ProgressBar: {
          props: ['value'],
          template: '<div data-progress-value>{{ value }}</div>',
        },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })

describe('GoalCard', () => {
  it('показывает progress bar и переход по action', async () => {
    const wrapper = mountCard('active')
    expect(wrapper.get('[data-goal-progress]').exists()).toBe(true)
    await wrapper.get('[data-goal-action]').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('показывает кнопку получения и вызывает claim', async () => {
    const wrapper = mountCard('completed')
    await wrapper.get('[data-goal-claim]').trigger('click')
    expect(wrapper.emitted('claim')).toHaveLength(1)
  })

  it('показывает claimed без кнопки и locked без action', () => {
    expect(mountCard('claimed').find('[data-goal-claim]').exists()).toBe(false)
    expect(mountCard('locked').find('[data-goal-action]').exists()).toBe(false)
  })
})
