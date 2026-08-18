import { describe, expect, it } from 'vitest'
import { mergeSaveSnapshots } from '@/services/saveMerge'
import type { LocalSaveSnapshot } from '@/services/cloudSave'

const snapshot = (tables: Record<string, unknown[]>): LocalSaveSnapshot => ({
  schemaVersion: 1,
  tables: Object.entries(tables).map(([name, rows]) => ({ name, rows })),
})

const rows = (save: LocalSaveSnapshot, name: string): Record<string, unknown>[] =>
  (save.tables.find((table) => table.name === name)?.rows ?? []) as Record<string, unknown>[]

describe('mergeSaveSnapshots', () => {
  it('combines balance deltas made on two devices', () => {
    const base = snapshot({
      player: [{ id: 'current', coins: 100, energy: 50, energyUpdatedAt: 1 }],
    })
    const local = snapshot({
      player: [{ id: 'current', coins: 80, energy: 45, energyUpdatedAt: 2 }],
    })
    const remote = snapshot({
      player: [{ id: 'current', coins: 110, energy: 48, energyUpdatedAt: 3 }],
    })

    const merged = mergeSaveSnapshots(base, local, remote)

    expect(rows(merged, 'player')[0]).toMatchObject({ coins: 90, energy: 48 })
  })

  it('keeps independently created entities from both devices', () => {
    const merged = mergeSaveSnapshots(
      snapshot({ inventory: [] }),
      snapshot({ inventory: [{ id: 'local-pack', type: 'pack' }] }),
      snapshot({ inventory: [{ id: 'remote-pack', type: 'pack' }] }),
    )

    expect(rows(merged, 'inventory').map(({ id }) => id)).toEqual([
      'local-pack',
      'remote-pack',
    ])
  })

  it('does not restore an entity spent on either device', () => {
    const pack = { id: 'pack-1', type: 'pack', createdAt: 1 }
    const merged = mergeSaveSnapshots(
      snapshot({ inventory: [pack] }),
      snapshot({ inventory: [] }),
      snapshot({ inventory: [{ ...pack, packId: 'standard' }] }),
    )

    expect(rows(merged, 'inventory')).toEqual([])
  })

  it('combines daily task progress without relying on device clocks', () => {
    const baseTask = { taskId: 'open-packs-2', progress: 0, status: 'in-progress' }
    const merged = mergeSaveSnapshots(
      snapshot({
        dailyTasks: [
          { id: 'current', dayKey: '2026-08-18', tasks: [baseTask], rewardClaimed: false },
        ],
      }),
      snapshot({
        dailyTasks: [
          {
            id: 'current',
            dayKey: '2026-08-18',
            tasks: [{ ...baseTask, progress: 1 }],
            rewardClaimed: false,
          },
        ],
      }),
      snapshot({
        dailyTasks: [
          {
            id: 'current',
            dayKey: '2026-08-18',
            tasks: [{ ...baseTask, progress: 2, status: 'completed' }],
            rewardClaimed: false,
          },
        ],
      }),
    )

    expect(rows(merged, 'dailyTasks')[0].tasks).toEqual([
      { taskId: 'open-packs-2', progress: 2, status: 'completed' },
    ])
  })
})
