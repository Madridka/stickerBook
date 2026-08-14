import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlbumPityState } from '@/features/pity/types'

const persisted = vi.hoisted(() => new Map<string, AlbumPityState>())

vi.mock('@/db/database', () => ({
  database: {
    albumPityStates: {
      get: vi.fn(async (albumId: string): Promise<AlbumPityState | undefined> =>
        persisted.get(albumId)),
      put: vi.fn(async (state: AlbumPityState): Promise<void> => {
        persisted.set(state.albumId, { ...state })
      }),
    },
  },
}))

import {
  getAlbumPityContext,
  registerCardAcquisition,
  registerEligiblePackOutcome,
} from '@/features/pity/albumPityService'

describe('album pity persistence', () => {
  beforeEach(() => persisted.clear())

  it('persists the independent dry-pack sequence 0 → 1 → 2 → 3 → 4', async () => {
    for (let count = 1; count <= 4; count += 1) {
      await registerEligiblePackOutcome('wc-26', false, count)
      expect(persisted.get('wc-26')?.dryPackCount).toBe(count)
    }
    expect(persisted.get('ucl-26-27')).toBeUndefined()
  })

  it('counts three all-duplicate packs at 96% completion as three dry packs', async () => {
    for (let packNumber = 1; packNumber <= 3; packNumber += 1) {
      await expect(getAlbumPityContext('wc-26', 96, 100, packNumber)).resolves.toEqual({
        eligible: true,
        dryPackCount: packNumber - 1,
      })
      await registerEligiblePackOutcome('wc-26', false, packNumber)
    }

    expect(persisted.get('wc-26')).toEqual({
      albumId: 'wc-26',
      dryPackCount: 3,
      updatedAt: 3,
    })
  })

  it('restores a saved counter after service reinitialization', async () => {
    persisted.set('wc-26', { albumId: 'wc-26', dryPackCount: 3, updatedAt: 1 })
    await expect(getAlbumPityContext('wc-26', 95, 100)).resolves.toEqual({
      eligible: true,
      dryPackCount: 3,
    })
  })

  it('persists an eligible zero counter so admin diagnostics can see it', async () => {
    await expect(getAlbumPityContext('wc-26', 95, 100, 7)).resolves.toEqual({
      eligible: true,
      dryPackCount: 0,
    })
    expect(persisted.get('wc-26')).toEqual({
      albumId: 'wc-26',
      dryPackCount: 0,
      updatedAt: 7,
    })
  })

  it('resets on any new reward while a duplicate reward leaves it unchanged', async () => {
    persisted.set('wc-26', { albumId: 'wc-26', dryPackCount: 3, updatedAt: 1 })
    await registerCardAcquisition('wc-26', false, 2)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(3)
    await registerCardAcquisition('wc-26', true, 3)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)
  })

  it('resets a protected sequence after natural pack success', async () => {
    persisted.set('wc-26', { albumId: 'wc-26', dryPackCount: 4, updatedAt: 1 })
    await registerEligiblePackOutcome('wc-26', true, 2)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)
  })

  it('clears stale state below 95% and for a completed album', async () => {
    persisted.set('wc-26', { albumId: 'wc-26', dryPackCount: 4, updatedAt: 1 })
    await expect(getAlbumPityContext('wc-26', 9449, 10000, 2)).resolves.toEqual({
      eligible: false,
      dryPackCount: 0,
    })
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)

    persisted.set('wc-26', { albumId: 'wc-26', dryPackCount: 4, updatedAt: 3 })
    await getAlbumPityContext('wc-26', 100, 100, 4)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)
  })
})
