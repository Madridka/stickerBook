import type { AlbumContentsItem } from '@/types'
import manifest from './manifest.json'

const logoCardUrl = (teamId: string, code: string): string =>
  `/russia/rpl-26-27/cards/${teamId}/RPL-${code}-01-team-logo.webp`

const albumContentsTeams: AlbumContentsItem[] = manifest.clubs.map(
  ({ teamId, code }): AlbumContentsItem => ({
    id: teamId,
    flag: logoCardUrl(teamId, code),
    pageId: `${teamId}-left`,
    nameKey: `album.contents.rpl.teams.${teamId}`,
    group: 'clubs',
  }),
)

export default albumContentsTeams
