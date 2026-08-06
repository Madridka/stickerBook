import type { AlbumContentsItem } from '@/types'
import manifest from './manifest.json'

const logoCardUrl = (teamId: string, code: string): string =>
  `/ucl-26-27/cards/${teamId}/UCL-${code}-01-team-logo.webp`

// Manifest задаёт единый порядок клубов для оглавления, геометрии и каталога карточек.
const albumContentsTeams: AlbumContentsItem[] = manifest.clubs.map(
  ({ teamId, code }): AlbumContentsItem => ({
    id: teamId,
    flag: logoCardUrl(teamId, code),
    pageId: `${teamId}-left`,
    nameKey: `album.contents.ucl.teams.${teamId}`,
    group: 'clubs',
  }),
)

export default albumContentsTeams
