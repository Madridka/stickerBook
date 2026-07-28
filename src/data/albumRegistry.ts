import { BLISTER_CONFIGS, PACK_CONFIGS } from './mainConst'
import infoGeometry from './info/album'
import wc26Geometry from './wc-26/album'
import wc26Cards, { catalogs as wc26Catalogs } from './wc-26/catalog'
import wc26Contents from './wc-26/contents'
import kdvGeometry from './kdv/album'
import kdvCards, { catalogs as kdvCatalogs } from './kdv/catalog'
import type {
  AlbumDefinition,
  AlbumEditorialPageDefinition,
  AlbumId,
  AlbumProgress,
  AlbumSpread,
  BlisterDefinition,
  CardDefinition,
} from '@/types'

const createSpreads = (albumId: AlbumId, pageIds: string[]): AlbumSpread[] =>
  Array.from({ length: Math.ceil(pageIds.length / 2) }, (_value, index): AlbumSpread => {
    const left: string = pageIds[index * 2]
    const right: string | undefined = pageIds[index * 2 + 1]
    return {
      id: `${albumId}-spread-${index + 1}`,
      pageIds: right ? [left, right] : [left],
    }
  })

const toBlisterDefinition = (
  config: (typeof BLISTER_CONFIGS)[keyof typeof BLISTER_CONFIGS],
): BlisterDefinition => ({
  id: config.id,
  albumId: config.albumId,
  titleKey: config.titleKey,
  cost: config.cost,
  cardCount: config.cardsPerPack,
  cooldownMs: config.cooldownMs,
  poolId: config.poolId,
  rarityOdds: config.rarityOdds,
})

const infoEditorialPages: AlbumEditorialPageDefinition[] = [
  {
    pageId: 'info-cover',
    kind: 'cover',
    eyebrow: 'album.editorial.infoMagazine.cover.eyebrow',
    title: 'album.editorial.infoMagazine.cover.title',
    description: 'album.editorial.infoMagazine.cover.description',
    footer: 'album.editorial.infoMagazine.cover.footer',
    tone: 'light',
  },
  {
    pageId: 'info-about',
    kind: 'article',
    eyebrow: 'album.editorial.infoMagazine.about.eyebrow',
    title: 'album.editorial.infoMagazine.about.title',
    description: 'album.editorial.infoMagazine.about.description',
    align: 'left',
    features: [
      {
        title: 'album.editorial.infoMagazine.about.features.collection.title',
        description: 'album.editorial.infoMagazine.about.features.collection.description',
      },
      {
        title: 'album.editorial.infoMagazine.about.features.magazines.title',
        description: 'album.editorial.infoMagazine.about.features.magazines.description',
      },
      {
        title: 'album.editorial.infoMagazine.about.features.cards.title',
        description: 'album.editorial.infoMagazine.about.features.cards.description',
      },
    ],
  },
  {
    pageId: 'info-gameplay',
    kind: 'article',
    eyebrow: 'album.editorial.infoMagazine.gameplay.eyebrow',
    title: 'album.editorial.infoMagazine.gameplay.title',
    description: 'album.editorial.infoMagazine.gameplay.description',
    align: 'right',
    features: [
      {
        title: 'album.editorial.infoMagazine.gameplay.features.earn.title',
        description: 'album.editorial.infoMagazine.gameplay.features.earn.description',
      },
      {
        title: 'album.editorial.infoMagazine.gameplay.features.open.title',
        description: 'album.editorial.infoMagazine.gameplay.features.open.description',
      },
      {
        title: 'album.editorial.infoMagazine.gameplay.features.prepare.title',
        description: 'album.editorial.infoMagazine.gameplay.features.prepare.description',
      },
      {
        title: 'album.editorial.infoMagazine.gameplay.features.complete.title',
        description: 'album.editorial.infoMagazine.gameplay.features.complete.description',
      },
    ],
  },
  {
    pageId: 'info-system',
    kind: 'article',
    eyebrow: 'album.editorial.infoMagazine.system.eyebrow',
    title: 'album.editorial.infoMagazine.system.title',
    description: 'album.editorial.infoMagazine.system.description',
    align: 'left',
    features: [
      {
        title: 'album.editorial.infoMagazine.system.features.registry.title',
        description: 'album.editorial.infoMagazine.system.features.registry.description',
      },
      {
        title: 'album.editorial.infoMagazine.system.features.progress.title',
        description: 'album.editorial.infoMagazine.system.features.progress.description',
      },
      {
        title: 'album.editorial.infoMagazine.system.features.variants.title',
        description: 'album.editorial.infoMagazine.system.features.variants.description',
      },
    ],
  },
  {
    pageId: 'info-changelog',
    kind: 'changelog',
    eyebrow: 'album.editorial.infoMagazine.changelog.eyebrow',
    title: 'album.editorial.infoMagazine.changelog.title',
    description: 'album.editorial.infoMagazine.changelog.description',
    align: 'right',
  },
]

const infoAlbum: AlbumDefinition = {
  id: 'info',
  name: 'album.library.items.info.title',
  shortName: 'album.library.items.info.shortTitle',
  description: 'album.library.items.info.description',
  route: '/album/info',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-coral',
  },
  geometry: infoGeometry,
  pages: infoGeometry.pages,
  spreads: createSpreads('info', infoGeometry.pages.map(({ id }) => id)),
  cards: [],
  catalogs: [],
  contents: [],
  editorialPages: infoEditorialPages,
  layout: {
    openStartPage: 1,
  },
  dropSettings: {
    poolId: 'standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  blisters: [],
  metadata: { kind: 'information' },
}

const wc26Album: AlbumDefinition = {
  id: 'wc-26',
  name: 'album.library.items.wc-26.title',
  shortName: 'album.library.items.wc-26.shortTitle',
  description: 'album.library.items.wc-26.description',
  route: '/album/wc-26',
  theme: {
    coverImage: 'info/wc26-cover.png',
    previewImage: 'info/wc26-cover.png',
    accentClass: 'text-coral',
  },
  geometry: wc26Geometry,
  pages: wc26Geometry.pages,
  spreads: createSpreads('wc-26', wc26Geometry.pages.map(({ id }) => id)),
  cards: wc26Cards,
  catalogs: wc26Catalogs,
  contents: wc26Contents,
  editorialPages: [
    {
      pageId: 'wc26-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.wc26.cover.eyebrow',
      title: 'album.editorial.wc26.cover.title',
      description: 'album.editorial.wc26.cover.description',
      footer: 'album.editorial.wc26.cover.footer',
      tone: 'light',
    },
    {
      pageId: 'wc26-hosts',
      kind: 'article',
      eyebrow: 'album.editorial.wc26.hosts.eyebrow',
      title: 'album.editorial.wc26.hosts.title',
      description: 'album.editorial.wc26.hosts.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.wc26.hosts.features.teams.title',
          description: 'album.editorial.wc26.hosts.features.teams.description',
        },
        {
          title: 'album.editorial.wc26.hosts.features.hosts.title',
          description: 'album.editorial.wc26.hosts.features.hosts.description',
        },
        {
          title: 'album.editorial.wc26.hosts.features.album.title',
          description: 'album.editorial.wc26.hosts.features.album.description',
        },
      ],
    },
    {
      pageId: 'wc26-format',
      kind: 'article',
      eyebrow: 'album.editorial.wc26.format.eyebrow',
      title: 'album.editorial.wc26.format.title',
      description: 'album.editorial.wc26.format.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.wc26.format.features.groups.title',
          description: 'album.editorial.wc26.format.features.groups.description',
        },
        {
          title: 'album.editorial.wc26.format.features.playoff.title',
          description: 'album.editorial.wc26.format.features.playoff.description',
        },
        {
          title: 'album.editorial.wc26.format.features.route.title',
          description: 'album.editorial.wc26.format.features.route.description',
        },
      ],
    },
  ],
  layout: {
    openStartPage: 1,
    contentsFirstPage: 4,
    contentsLastPage: 7,
    contentsPageSize: 12,
  },
  dropSettings: {
    poolId: 'standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  blisters: [toBlisterDefinition(BLISTER_CONFIGS.standard)],
  metadata: { edition: 1 },
}

const kdvAlbum: AlbumDefinition = {
  id: 'kdv',
  name: 'album.library.items.kdv.title',
  shortName: 'album.library.items.kdv.shortTitle',
  description: 'album.library.items.kdv.description',
  route: '/album/kdv',
  theme: {
    coverImage: 'info/cover.png',
    previewImage: 'info/cover.png',
    accentClass: 'text-gold',
  },
  geometry: kdvGeometry,
  pages: kdvGeometry.pages,
  spreads: createSpreads('kdv', kdvGeometry.pages.map(({ id }) => id)),
  cards: kdvCards,
  catalogs: kdvCatalogs,
  contents: [],
  editorialPages: [
    {
      pageId: 'kdv-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.kdv.cover.eyebrow',
      title: 'album.editorial.kdv.cover.title',
      description: 'album.editorial.kdv.cover.description',
      footer: 'album.editorial.kdv.cover.footer',
      tone: 'dark',
    },
    {
      pageId: 'kdv-about',
      kind: 'article',
      eyebrow: 'album.editorial.kdv.about.eyebrow',
      title: 'album.editorial.kdv.about.title',
      description: 'album.editorial.kdv.about.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.kdv.about.features.identity.title',
          description: 'album.editorial.kdv.about.features.identity.description',
        },
        {
          title: 'album.editorial.kdv.about.features.support.title',
          description: 'album.editorial.kdv.about.features.support.description',
        },
        {
          title: 'album.editorial.kdv.about.features.magazine.title',
          description: 'album.editorial.kdv.about.features.magazine.description',
        },
      ],
    },
    {
      pageId: 'kdv-team',
      kind: 'article',
      eyebrow: 'album.editorial.kdv.team.eyebrow',
      title: 'album.editorial.kdv.team.title',
      description: 'album.editorial.kdv.team.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.kdv.team.features.roles.title',
          description: 'album.editorial.kdv.team.features.roles.description',
        },
        {
          title: 'album.editorial.kdv.team.features.academy.title',
          description: 'album.editorial.kdv.team.features.academy.description',
        },
        {
          title: 'album.editorial.kdv.team.features.collection.title',
          description: 'album.editorial.kdv.team.features.collection.description',
        },
      ],
    },
  ],
  layout: {
    openStartPage: 1,
  },
  dropSettings: {
    poolId: 'standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  blisters: [toBlisterDefinition(BLISTER_CONFIGS.kdv)],
  metadata: { club: 'kdv' },
}

const definitions: AlbumDefinition[] = [infoAlbum, wc26Album, kdvAlbum]
const registry: ReadonlyMap<AlbumId, AlbumDefinition> = new Map(
  definitions.map((album): [AlbumId, AlbumDefinition] => [album.id, album]),
)
const blisters: ReadonlyMap<string, BlisterDefinition> = new Map(
  definitions.flatMap((album) =>
    album.blisters.map((blister): [string, BlisterDefinition] => [blister.id, blister]),
  ),
)
const albumPageAssets: Record<string, string> = import.meta.glob(
  [
    '../../assets/game/*/main/album/**/*.webp',
    '../../assets/game/*/main/album/**/*.png',
  ],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

// Проверяет все межфайловые связи до того, как конфигурация попадёт в интерфейс.
const validateAlbum = (album: AlbumDefinition): void => {
  const cardIds: string[] = album.cards.map(({ id }) => id)
  const cardNumbers: string[] = album.cards.map(
    ({ teamId, cardNumber }) => `${teamId}:${cardNumber}`,
  )
  const albumSlots: string[] = album.cards.flatMap(({ teamId, albumSlot }) =>
    albumSlot === undefined ? [] : [`${teamId}:${albumSlot}`],
  )
  const slots = album.pages.flatMap(({ slots: pageSlots }) => pageSlots)
  const slotIds: string[] = slots.map(({ id }) => id)
  const pageIds: string[] = album.pages.map(({ id }) => id)

  if (new Set(cardIds).size !== cardIds.length) throw new Error(`${album.id}: duplicate card id`)
  if (new Set(cardNumbers).size !== cardNumbers.length) {
    throw new Error(`${album.id}: duplicate card number`)
  }
  if (new Set(slotIds).size !== slotIds.length) throw new Error(`${album.id}: duplicate slot id`)
  if (new Set(pageIds).size !== pageIds.length) throw new Error(`${album.id}: duplicate page id`)
  if (new Set(albumSlots).size !== albumSlots.length) {
    throw new Error(`${album.id}: duplicate album slot`)
  }

  const knownCards: Set<string> = new Set(cardIds)
  for (const card of album.cards) {
    if (card.albumId !== album.id || card.collectionId !== album.id) {
      throw new Error(`${album.id}: card ${card.id} belongs to another album`)
    }
    if (!card.image) throw new Error(`${album.id}: card ${card.id} has no image`)
    if (!card.image.includes(`/${album.id}/cards/`)) {
      throw new Error(`${album.id}: card ${card.id} has an invalid image path`)
    }
  }
  for (const page of album.pages) {
    const assetKey: string = `../../assets/game/${album.id}/main/album/${page.image}`
    if (!albumPageAssets[assetKey]) {
      throw new Error(`${album.id}: page ${page.id} references a missing image`)
    }
  }
  for (const slot of slots) {
    if (!knownCards.has(slot.playerId)) {
      throw new Error(`${album.id}: slot ${slot.id} references unknown card ${slot.playerId}`)
    }
  }
  for (const spread of album.spreads) {
    if (spread.pageIds.some((pageId) => !pageIds.includes(pageId))) {
      throw new Error(`${album.id}: spread ${spread.id} references unknown page`)
    }
  }
  for (const editorialPage of album.editorialPages) {
    if (!pageIds.includes(editorialPage.pageId)) {
      throw new Error(`${album.id}: editorial page ${editorialPage.pageId} is missing`)
    }
  }
}

if (import.meta.env.DEV) {
  if (registry.size !== definitions.length) throw new Error('Duplicate album id')
  if (blisters.size !== definitions.flatMap(({ blisters: items }) => items).length) {
    throw new Error('Duplicate blister id')
  }
  definitions.forEach(validateAlbum)
}

export const getAlbums = (): readonly AlbumDefinition[] => definitions
export const getAlbumById = (albumId: AlbumId): AlbumDefinition | undefined =>
  registry.get(albumId)
export const requireAlbum = (albumId: AlbumId): AlbumDefinition => {
  const album: AlbumDefinition | undefined = getAlbumById(albumId)
  if (!album) throw new Error(`Unknown album: ${albumId}`)
  return album
}
export const getAlbumCards = (albumId: AlbumId): readonly CardDefinition[] =>
  requireAlbum(albumId).cards
export const getAlbumCard = (
  albumId: AlbumId,
  cardId: string,
): CardDefinition | undefined => getAlbumById(albumId)?.cards.find(({ id }) => id === cardId)
export const getBlisterById = (blisterId: string): BlisterDefinition | undefined =>
  blisters.get(blisterId)
export const getBlisters = (): readonly BlisterDefinition[] => Array.from(blisters.values())

export const createEmptyAlbumProgress = (albumId: AlbumId): AlbumProgress => ({
  albumId,
  totalCards: getAlbumById(albumId)?.cards.length ?? 0,
  collectedCards: 0,
  placedCards: 0,
  duplicateCards: 0,
  completionPercent: 0,
})
