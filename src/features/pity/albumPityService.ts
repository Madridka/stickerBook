import { database } from '@/db/database'
import type { AlbumId } from '@/types'
import type { RandomSource } from '@/utils/dropEngine'
import { PITY_CONFIG } from '@/config/gameBalance'
import { isPityCompletionEligible, selectPityDryPackTarget } from './pityDomain'
import type { AlbumPityState } from './types'

export interface AlbumPityContext {
  eligible: boolean
  dryPackCount: number
  dryPacksBeforeGuarantee: number
}

const logPity = (message: string): void => {
  if (import.meta.env.DEV) console.debug(`[PITY] ${message}`)
}

const normalizeDryPackCount = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

const normalizeDryPackTarget = (
  value: number | undefined,
  randomSource: RandomSource,
): number => {
  if (
    value !== undefined &&
    Number.isInteger(value) &&
    value >= PITY_CONFIG.minDryPacksBeforeGuarantee &&
    value <= PITY_CONFIG.maxDryPacksBeforeGuarantee
  ) {
    return value
  }
  return selectPityDryPackTarget(randomSource)
}

export const getAlbumPityContext = async (
  albumId: AlbumId,
  collectedCards: number,
  totalCards: number,
  now: number = Date.now(),
  randomSource: RandomSource = Math.random,
): Promise<AlbumPityContext> => {
  const state: AlbumPityState | undefined = await database.albumPityStates.get(albumId)
  const eligible: boolean = isPityCompletionEligible(collectedCards, totalCards)
  if (!eligible) {
    if (!state) {
      return {
        eligible: false,
        dryPackCount: 0,
        dryPacksBeforeGuarantee: PITY_CONFIG.minDryPacksBeforeGuarantee,
      }
    }
    const hadActiveSequence: boolean = normalizeDryPackCount(state.dryPackCount) > 0
    const dryPacksBeforeGuarantee: number = hadActiveSequence
      ? selectPityDryPackTarget(randomSource)
      : normalizeDryPackTarget(state.dryPacksBeforeGuarantee, randomSource)
    if (
      state.dryPackCount !== 0 ||
      state.dryPacksBeforeGuarantee !== dryPacksBeforeGuarantee
    ) {
      await database.albumPityStates.put({
        albumId,
        dryPackCount: 0,
        dryPacksBeforeGuarantee,
        updatedAt: now,
      })
    }
    return {
      eligible: false,
      dryPackCount: 0,
      dryPacksBeforeGuarantee,
    }
  }

  const dryPackCount: number = normalizeDryPackCount(state?.dryPackCount)
  const dryPacksBeforeGuarantee: number = normalizeDryPackTarget(
    state?.dryPacksBeforeGuarantee,
    randomSource,
  )
  if (
    !state ||
    state.dryPackCount !== dryPackCount ||
    state.dryPacksBeforeGuarantee !== dryPacksBeforeGuarantee
  ) {
    await database.albumPityStates.put({
      albumId,
      dryPackCount,
      dryPacksBeforeGuarantee,
      updatedAt: now,
    })
  }
  logPity(
    `album=${albumId} completion=${(collectedCards / totalCards).toFixed(3)} dryPackCount=${dryPackCount}/${dryPacksBeforeGuarantee}`,
  )
  return { eligible: true, dryPackCount, dryPacksBeforeGuarantee }
}

export const resetAlbumPity = async (
  albumId: AlbumId,
  now: number = Date.now(),
  randomSource: RandomSource = Math.random,
): Promise<void> => {
  const state: AlbumPityState | undefined = await database.albumPityStates.get(albumId)
  if (!state || state.dryPackCount === 0) return
  await database.albumPityStates.put({
    albumId,
    dryPackCount: 0,
    dryPacksBeforeGuarantee: selectPityDryPackTarget(randomSource),
    updatedAt: now,
  })
}

export const registerCardAcquisition = async (
  albumId: AlbumId,
  isNewCard: boolean,
  now: number = Date.now(),
  randomSource: RandomSource = Math.random,
): Promise<void> => {
  if (isNewCard) await resetAlbumPity(albumId, now, randomSource)
}

export const registerEligiblePackOutcome = async (
  albumId: AlbumId,
  hasNewCard: boolean,
  now: number = Date.now(),
  randomSource: RandomSource = Math.random,
): Promise<void> => {
  if (hasNewCard) {
    await resetAlbumPity(albumId, now, randomSource)
    return
  }
  const state: AlbumPityState | undefined = await database.albumPityStates.get(albumId)
  const dryPackCount: number = normalizeDryPackCount(state?.dryPackCount) + 1
  const dryPacksBeforeGuarantee: number = normalizeDryPackTarget(
    state?.dryPacksBeforeGuarantee,
    randomSource,
  )
  await database.albumPityStates.put({
    albumId,
    dryPackCount,
    dryPacksBeforeGuarantee,
    updatedAt: now,
  })
  logPity(
    `dry pack registered album=${albumId} dryPackCount=${dryPackCount}/${dryPacksBeforeGuarantee}`,
  )
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
