import tom1996Logo from '../../../assets/game/tomsk/main/logos/tom-1996.webp?url'
import tom2008Logo from '../../../assets/game/tomsk/main/logos/tom-2008.webp?url'
import kdvLogo from '../../../assets/game/tomsk/main/logos/kdv-official.svg?url'
import type { AlbumContentsItem } from '@/types'

const contents: AlbumContentsItem[] = [
  {
    id: 'tom04',
    flag: tom1996Logo,
    pageId: 'tom04-left',
    nameKey: 'album.contents.tomsk.tom2000',
    descriptionKey: 'album.contents.tomsk.descriptions.tom2000',
    group: '1',
  },
  {
    id: 'tom07',
    flag: tom1996Logo,
    pageId: 'tom07-left',
    nameKey: 'album.contents.tomsk.tom2005',
    descriptionKey: 'album.contents.tomsk.descriptions.tom2005',
    group: '1',
  },
  {
    id: 'tom12',
    flag: tom2008Logo,
    pageId: 'tom12-left',
    nameKey: 'album.contents.tomsk.tom2008',
    descriptionKey: 'album.contents.tomsk.descriptions.tom2008',
    group: '1',
  },
  {
    id: 'tom22',
    flag: tom2008Logo,
    pageId: 'tom22-left',
    nameKey: 'album.contents.tomsk.tom2013',
    descriptionKey: 'album.contents.tomsk.descriptions.tom2013',
    group: '1',
  },
  {
    id: 'kdv',
    flag: kdvLogo,
    pageId: 'kdv-left',
    nameKey: 'album.contents.tomsk.kdv',
    descriptionKey: 'album.contents.tomsk.descriptions.kdv',
    group: '2',
  },
]

export default contents
