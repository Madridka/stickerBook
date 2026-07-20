import mexicoPages from './mexico/pages.json'
import spainPages from './spain/pages.json'
import portugalPages from './portugal/pages.json'
import croatiaPages from './croatia/pages.json'
import argentinaPages from './argentina/pages.json'

const visibleTeamPages = [
  ...mexicoPages,
  ...spainPages,
  ...portugalPages,
  ...croatiaPages,
  ...argentinaPages,
].map((page, index) => ({
  ...page,
  number: index + 6,
}))

export default {
  id: 'world-cup-2026',
  stickerRatio: { width: 2, height: 3 },
  pages: [
    {
      id: 'project-cover',
      number: 1,
      image: 'cover.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'project-info',
      number: 2,
      image: 'info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'project-changelog',
      number: 3,
      image: 'info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'contents',
      number: 4,
      image: 'info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'contents-divider',
      number: 5,
      image: 'info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    ...visibleTeamPages,
  ],
}
