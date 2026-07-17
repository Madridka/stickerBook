import mexicoPages from './mexico/pages.json'
import croatiaPages from './croatia/pages.json'

export default {
  id: 'world-cup-2026',
  stickerRatio: { width: 2, height: 3 },
  pages: [
    {
      id: 'project-cover',
      number: 1,
      image: 'page-01-cover.png',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'project-info',
      number: 2,
      image: 'page-02-info-left.png',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'project-changelog',
      number: 3,
      image: 'page-03-info-right.png',
      width: 1536,
      height: 1200,
      slots: [],
    },
    ...mexicoPages,
    ...croatiaPages,
  ],
}
