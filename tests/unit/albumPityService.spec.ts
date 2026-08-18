import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlbumPityState } from '@/features/pity/types'

const minimumRoll = (): number => 0
const maximumRoll = (): number => 0.999999

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

  it('persists the independent dry-pack sequence and its random target', async () => {
    for (let count = 1; count <= 4; count += 1) {
      await registerEligiblePackOutcome('wc-26', false, count, minimumRoll)
      expect(persisted.get('wc-26')?.dryPackCount).toBe(count)
      expect(persisted.get('wc-26')?.dryPacksBeforeGuarantee).toBe(2)
    }
    expect(persisted.get('ucl-26-27')).toBeUndefined()
  })

  it('counts three all-duplicate packs at 96% completion as three dry packs', async () => {
    for (let packNumber = 1; packNumber <= 3; packNumber += 1) {
      await expect(
        getAlbumPityContext('wc-26', 96, 100, packNumber, minimumRoll),
      ).resolves.toEqual({
        eligible: true,
        dryPackCount: packNumber - 1,
        dryPacksBeforeGuarantee: 2,
      })
      await registerEligiblePackOutcome('wc-26', false, packNumber, minimumRoll)
    }

    expect(persisted.get('wc-26')).toEqual({
      albumId: 'wc-26',
      dryPackCount: 3,
      dryPacksBeforeGuarantee: 2,
      updatedAt: 3,
    })
  })

  it('restores a saved counter and target after service reinitialization', async () => {
    persisted.set('wc-26', {
      albumId: 'wc-26',
      dryPackCount: 3,
      dryPacksBeforeGuarantee: 5,
      updatedAt: 1,
    })
    await expect(getAlbumPityContext('wc-26', 95, 100)).resolves.toEqual({
      eligible: true,
      dryPackCount: 3,
      dryPacksBeforeGuarantee: 5,
    })
  })

  it('adds a random target to a state saved by the old fixed-threshold version', async () => {
    persisted.set(
      'wc-26',
      { albumId: 'wc-26', dryPackCount: 3, updatedAt: 1 } as AlbumPityState,
    )

    await expect(
      getAlbumPityContext('wc-26', 95, 100, 2, maximumRoll),
    ).resolves.toEqual({
      eligible: true,
      dryPackCount: 3,
      dryPacksBeforeGuarantee: 6,
    })
    expect(persisted.get('wc-26')?.dryPacksBeforeGuarantee).toBe(6)
  })

  it('persists an eligible zero counter so admin diagnostics can see it', async () => {
    await expect(
      getAlbumPityContext('wc-26', 95, 100, 7, minimumRoll),
    ).resolves.toEqual({
      eligible: true,
      dryPackCount: 0,
      dryPacksBeforeGuarantee: 2,
    })
    expect(persisted.get('wc-26')).toEqual({
      albumId: 'wc-26',
      dryPackCount: 0,
      dryPacksBeforeGuarantee: 2,
      updatedAt: 7,
    })
  })

  it('resets and rerolls on a new reward while a duplicate leaves the sequence unchanged', async () => {
    persisted.set('wc-26', {
      albumId: 'wc-26',
      dryPackCount: 3,
      dryPacksBeforeGuarantee: 5,
      updatedAt: 1,
    })
    await registerCardAcquisition('wc-26', false, 2, minimumRoll)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(3)
    expect(persisted.get('wc-26')?.dryPacksBeforeGuarantee).toBe(5)
    await registerCardAcquisition('wc-26', true, 3, minimumRoll)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)
    expect(persisted.get('wc-26')?.dryPacksBeforeGuarantee).toBe(2)
  })

  it('resets a protected sequence and selects the next target after success', async () => {
    persisted.set('wc-26', {
      albumId: 'wc-26',
      dryPackCount: 4,
      dryPacksBeforeGuarantee: 4,
      updatedAt: 1,
    })
    await registerEligiblePackOutcome('wc-26', true, 2, maximumRoll)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)
    expect(persisted.get('wc-26')?.dryPacksBeforeGuarantee).toBe(6)
  })

  it('clears stale state below 95% and for a completed album', async () => {
    persisted.set('wc-26', {
      albumId: 'wc-26',
      dryPackCount: 4,
      dryPacksBeforeGuarantee: 4,
      updatedAt: 1,
    })
    await expect(
      getAlbumPityContext('wc-26', 9449, 10000, 2, minimumRoll),
    ).resolves.toEqual({
      eligible: false,
      dryPackCount: 0,
      dryPacksBeforeGuarantee: 2,
    })
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)

    persisted.set('wc-26', {
      albumId: 'wc-26',
      dryPackCount: 4,
      dryPacksBeforeGuarantee: 4,
      updatedAt: 3,
    })
    await getAlbumPityContext('wc-26', 100, 100, 4, minimumRoll)
    expect(persisted.get('wc-26')?.dryPackCount).toBe(0)
  })
})
