const albumPageAssets: Record<string, string> = import.meta.glob(
  [
    '../../assets/game/*/main/album/**/*.webp',
    '!../../assets/game/*/main/album/source/**',
  ],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

const createAssetKey = (albumId: string, image: string): string =>
  `../../assets/game/${albumId}/main/album/${image}`

export const resolveAlbumPageAsset = (
  albumId: string,
  image: string,
): string | undefined => albumPageAssets[createAssetKey(albumId, image)]

export const hasAlbumPageAsset = (albumId: string, image: string): boolean =>
  resolveAlbumPageAsset(albumId, image) !== undefined
