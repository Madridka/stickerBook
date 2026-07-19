import mexicoFlag from '@/assets/flags/mexico.svg?url'
import croatiaFlag from '@/assets/flags/croatia.svg?url'
import portugalFlag from '@/assets/flags/portugal.svg?url'
import englandFlag from '@/assets/flags/england.svg?url'

export interface AlbumContentsTeam {
  id: string
  flag: string
  pageId: string
  nameKey: string
}

const albumContentsTeams: AlbumContentsTeam[] = [
  {
    id: 'mexico',
    flag: mexicoFlag,
    pageId: 'mexico-left',
    nameKey: 'album.contents.teams.mexico',
  },
  {
    id: 'croatia',
    flag: croatiaFlag,
    pageId: 'croatia-left',
    nameKey: 'album.contents.teams.croatia',
  },
  {
    id: 'portugal',
    flag: portugalFlag,
    pageId: 'portugal-left',
    nameKey: 'album.contents.teams.portugal',
  },
]

export default albumContentsTeams
