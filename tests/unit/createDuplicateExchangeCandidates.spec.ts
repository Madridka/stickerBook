import { describe, expect, it } from 'vitest'
import { getPlayerAlbumById } from '@/data/albumRegistry'
import { createDuplicateExchangeCandidates } from '@/utils/createDuplicateExchangeCandidates'

describe('createDuplicateExchangeCandidates', () => {
  it('создаёт кандидатов из пула выбранного альбома ЛЧ', () => {
    const album = getPlayerAlbumById('ucl-26-27')

    expect(album).toBeDefined()
    if (!album) return

    const candidates = createDuplicateExchangeCandidates(
      album.catalogs,
      new Set(['ucl-26-27-ars-01']),
      5,
      () => 0,
      album.dropSettings.poolId,
    )

    expect(candidates).toHaveLength(5)
    expect(new Set(candidates).size).toBe(5)
    expect(candidates).not.toContain('ucl-26-27-ars-01')
    expect(candidates.every((id) => id.startsWith('ucl-26-27-'))).toBe(true)
  })
})
