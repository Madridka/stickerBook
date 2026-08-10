import { database } from '@/db/database'
import type { AlbumId } from '@/types'
import { isPityCompletionEligible } from './pityDomain'
import type { AlbumPityState } from './types'

export interface AlbumPityContext {
  eligible: boolean
  dryPackCount: number
}

const logPity = (message: string): void => {
  if (import.meta.env.DEV) console.debug(`[PITY] ${message}`)
}

const normalizeDryPackCount = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

export const getAlbumPityContext = async (
  albumId: AlbumId,
  collectedCards: number,
  totalCards: number,
  now: number = Date.now(),
): Promise<AlbumPityContext> => {
  const state: AlbumPityState | undefined = await database.albumPityStates.get(albumId)
  const eligible: boolean = isPityCompletionEligible(collectedCards, totalCards)
  if (!eligible) {
    if ((state?.dryPackCount ?? 0) !== 0) {
      await database.albumPityStates.put({ albumId, dryPackCount: 0, updatedAt: now })
    }
    return { eligible: false, dryPackCount: 0 }
  }

  const dryPackCount: number = normalizeDryPackCount(state?.dryPackCount)
  logPity(
    `album=${albumId} completion=${(collectedCards / totalCards).toFixed(3)} dryPackCount=${dryPackCount}`,
  )
  return { eligible: true, dryPackCount }
}

export const resetAlbumPity = async (
  albumId: AlbumId,
  now: number = Date.now(),
): Promise<void> => {
  const state: AlbumPityState | undefined = await database.albumPityStates.get(albumId)
  if (!state || state.dryPackCount === 0) return
  await database.albumPityStates.put({ albumId, dryPackCount: 0, updatedAt: now })
}

export const registerCardAcquisition = async (
  albumId: AlbumId,
  isNewCard: boolean,
  now: number = Date.now(),
): Promise<void> => {
  if (isNewCard) await resetAlbumPity(albumId, now)
}

export const registerEligiblePackOutcome = async (
  albumId: AlbumId,
  hasNewCard: boolean,
  now: number = Date.now(),
): Promise<void> => {
  if (hasNewCard) {
    await resetAlbumPity(albumId, now)
    return
  }
  const state: AlbumPityState | undefined = await database.albumPityStates.get(albumId)
  const dryPackCount: number = normalizeDryPackCount(state?.dryPackCount) + 1
  await database.albumPityStates.put({ albumId, dryPackCount, updatedAt: now })
  logPity(`dry pack registered album=${albumId} dryPackCount=${dryPackCount}`)
}

export const logPityProtectionArmed = (albumId: AlbumId): void => {
  logPity(`protection armed album=${albumId}`)
}

export const logPityNaturalSuccess = (albumId: AlbumId): void => {
  logPity(`natural new card found before guarantee album=${albumId}`)
}

export const logPityApplied = (albumId: AlbumId): void => {
  logPity(`guaranteed missing applied album=${albumId}`)
}
