import type { AlbumId } from '@/types'

export interface AlbumPityState {
  albumId: AlbumId
  dryPackCount: number
  dryPacksBeforeGuarantee: number
  updatedAt: number
}
