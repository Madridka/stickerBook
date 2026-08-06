import uclContentsLeftUrl from '../../assets/game/ucl-26-27/main/album/info/contents-left.webp?url'
import uclContentsRightUrl from '../../assets/game/ucl-26-27/main/album/info/contents-right.webp?url'

const albumPageAssets: Record<string, string> = import.meta.glob(
  [
    '../../assets/game/*/main/album/**/*.webp',
    '!../../assets/game/*/main/album/source/**',
  ],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

// Явные записи позволяют HMR подхватить новые страницы, добавленные после запуска dev-сессии.
Object.assign(albumPageAssets, {
  '../../assets/game/ucl-26-27/main/album/info/contents-left.webp': uclContentsLeftUrl,
  '../../assets/game/ucl-26-27/main/album/info/contents-right.webp': uclContentsRightUrl,
})

const createAssetKey = (albumId: string, image: string): string =>
  `../../assets/game/${albumId}/main/album/${image}`

export const resolveAlbumPageAsset = (
  albumId: string,
  image: string,
): string | undefined => albumPageAssets[createAssetKey(albumId, image)]

export const hasAlbumPageAsset = (albumId: string, image: string): boolean =>
  resolveAlbumPageAsset(albumId, image) !== undefined
