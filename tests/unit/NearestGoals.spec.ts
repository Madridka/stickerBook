import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NearestGoals from '@/components/goals/NearestGoals.vue'
import type { GoalRuntimeState } from '@/features/goals/types'

const goal: GoalRuntimeState = {
  definition: {
    id: 'near',
    category: 'packs',
    title: 'Ближайшая цель',
    description: '',
    order: 1,
    requirements: [{ type: 'packs-opened', target: 5 }],
    reward: [{ type: 'coins', amount: 1 }],
  },
  status: 'active',
  progress: { current: 3, target: 5 },
  isRewardAvailable: false,
}

describe('NearestGoals', () => {
  it('показывает компактный прогресс и открывает все цели', async () => {
    const wrapper = mount(NearestGoals, { props: { goals: [goal] } })
    expect(wrapper.get('[data-nearest-goals]').text()).toContain('3 / 5')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})
