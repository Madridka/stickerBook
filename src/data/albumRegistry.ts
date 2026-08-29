import { ALBUM_VISIBILITY_CONFIG } from '@/config/albumConfig'
import {
  BLISTER_CONFIGS,
  PACK_CONFIGS,
  createClubLogoRarityOdds,
} from '@/config/gameBalance'
import { hasAlbumPageAsset } from './albumPageAssets'
import infoGeometry from './info/album'
import wc26Geometry from './wc-26/album'
import wc26Cards, { catalogs as wc26Catalogs } from './wc-26/catalog'
import wc26Contents from './wc-26/contents'
import ucl2627Geometry from './ucl-26-27/album'
import ucl2627Cards, { catalogs as ucl2627Catalogs } from './ucl-26-27/catalog'
import ucl2627Contents from './ucl-26-27/contents'
import rpl2627Geometry from './russia/album'
import rpl2627Cards, { catalogs as rpl2627Catalogs } from './russia/catalog'
import rpl2627Contents from './russia/contents'
import tomskGeometry from './tomsk/album'
import tomskCards, { catalogs as tomskCatalogs } from './tomsk/catalog'
import tomskContents from './tomsk/contents'
import spainClubsLogoGeometry from './spainClubsLogo/album'
import spainClubsLogoCards, { catalogs as spainClubsLogoCatalogs } from './spainClubsLogo/catalog'
import russiaClubsLogoGeometry from './russiaClubsLogo/album'
import russiaClubsLogoCards, { catalogs as russiaClubsLogoCatalogs } from './russiaClubsLogo/catalog'
import englandClubsLogoGeometry, { englandDivisionPageRanges } from './englandClubsLogo/album'
import englandClubsLogoCards, { catalogs as englandClubsLogoCatalogs } from './englandClubsLogo/catalog'
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
  rarityOdds: BlisterDefinition['rarityOdds'] = config.rarityOdds,
): BlisterDefinition => ({
  id: config.id,
  albumId: config.albumId,
  albumIds: config.albumIds,
  titleKey: config.titleKey,
  descriptionKey: config.descriptionKey,
  shortNameKey: config.shortNameKey,
  cost: config.cost,
  cardCount: config.cardsPerPack,
  cooldownMs: config.cooldownMs,
  poolId: config.poolId,
  rarityOdds,
  pityEligible: config.pityEligible,
})

const spainClubsLogoRarityOdds = createClubLogoRarityOdds(spainClubsLogoCards)
const russiaClubsLogoRarityOdds = createClubLogoRarityOdds(russiaClubsLogoCards)
const englandClubsLogoRarityOdds = createClubLogoRarityOdds(englandClubsLogoCards)

const shiftContentsPages = (
  sections: NonNullable<AlbumEditorialPageDefinition['contentsSections']>,
  offset: number,
): NonNullable<AlbumEditorialPageDefinition['contentsSections']> =>
  sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      pages: item.pages.replace(/\d+/g, (value) =>
        String(Number(value) + offset).padStart(value.length, '0'),
      ),
      targetPage: item.targetPage + offset,
    })),
  }))

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
    coverImage: 'info/wc26-cover.webp',
    previewImage: 'info/wc26-cover.webp',
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
  blisters: [
    toBlisterDefinition(BLISTER_CONFIGS.mixed),
    toBlisterDefinition(BLISTER_CONFIGS.standard),
  ],
  metadata: { edition: 1, kind: 'squads' },
}

const tomskAlbum: AlbumDefinition = {
  id: 'tomsk',
  name: 'album.library.items.tomsk.title',
  shortName: 'album.library.items.tomsk.shortTitle',
  description: 'album.library.items.tomsk.description',
  route: '/album/tomsk',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-gold',
  },
  geometry: tomskGeometry,
  pages: tomskGeometry.pages,
  spreads: createSpreads('tomsk', tomskGeometry.pages.map(({ id }) => id)),
  cards: tomskCards,
  catalogs: tomskCatalogs,
  contents: tomskContents,
  editorialPages: [
    {
      pageId: 'tomsk-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.tomsk.cover.eyebrow',
      title: 'album.editorial.tomsk.cover.title',
      description: 'album.editorial.tomsk.cover.description',
      footer: 'album.editorial.tomsk.cover.footer',
      tone: 'dark',
    },
    {
      pageId: 'tomsk-about',
      kind: 'article',
      eyebrow: 'album.editorial.tomsk.about.eyebrow',
      title: 'album.editorial.tomsk.about.title',
      description: 'album.editorial.tomsk.about.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.tomsk.about.features.identity.title',
          description: 'album.editorial.tomsk.about.features.identity.description',
        },
        {
          title: 'album.editorial.tomsk.about.features.support.title',
          description: 'album.editorial.tomsk.about.features.support.description',
        },
        {
          title: 'album.editorial.tomsk.about.features.magazine.title',
          description: 'album.editorial.tomsk.about.features.magazine.description',
        },
      ],
    },
    {
      pageId: 'tomsk-history',
      kind: 'article',
      eyebrow: 'album.editorial.tomsk.history.eyebrow',
      title: 'album.editorial.tomsk.history.title',
      description: 'album.editorial.tomsk.history.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.tomsk.history.features.roles.title',
          description: 'album.editorial.tomsk.history.features.roles.description',
        },
        {
          title: 'album.editorial.tomsk.history.features.eras.title',
          description: 'album.editorial.tomsk.history.features.eras.description',
        },
        {
          title: 'album.editorial.tomsk.history.features.collection.title',
          description: 'album.editorial.tomsk.history.features.collection.description',
        },
      ],
    },
  ],
  layout: {
    openStartPage: 1,
    contentsFirstPage: 4,
    contentsLastPage: 5,
    contentsPageSize: 4,
  },
  dropSettings: {
    poolId: 'standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  blisters: [toBlisterDefinition(BLISTER_CONFIGS.kdv)],
  metadata: { club: 'tomsk', kind: 'history', cardAssetAlbumIds: ['tomsk', 'kdv'] },
}

const ucl2627Album: AlbumDefinition = {
  id: 'ucl-26-27',
  name: 'album.library.items.ucl-26-27.title',
  shortName: 'album.library.items.ucl-26-27.shortTitle',
  description: 'album.library.items.ucl-26-27.description',
  route: '/album/ucl-26-27',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-coral',
  },
  geometry: ucl2627Geometry,
  pages: ucl2627Geometry.pages,
  spreads: createSpreads('ucl-26-27', ucl2627Geometry.pages.map(({ id }) => id)),
  cards: ucl2627Cards,
  catalogs: ucl2627Catalogs,
  contents: ucl2627Contents,
  editorialPages: [
    {
      pageId: 'ucl-26-27-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.ucl2627.cover.eyebrow',
      title: 'album.editorial.ucl2627.cover.title',
      description: 'album.editorial.ucl2627.cover.description',
      tone: 'dark',
      hideCoverCopy: true,
    },
    {
      pageId: 'ucl-26-27-season',
      kind: 'article',
      eyebrow: 'album.editorial.ucl2627.season.eyebrow',
      title: 'album.editorial.ucl2627.season.title',
      description: 'album.editorial.ucl2627.season.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.ucl2627.season.features.clubs.title',
          description: 'album.editorial.ucl2627.season.features.clubs.description',
        },
        {
          title: 'album.editorial.ucl2627.season.features.cards.title',
          description: 'album.editorial.ucl2627.season.features.cards.description',
        },
        {
          title: 'album.editorial.ucl2627.season.features.style.title',
          description: 'album.editorial.ucl2627.season.features.style.description',
        },
      ],
    },
    {
      pageId: 'ucl-26-27-collection',
      kind: 'article',
      eyebrow: 'album.editorial.ucl2627.collection.eyebrow',
      title: 'album.editorial.ucl2627.collection.title',
      description: 'album.editorial.ucl2627.collection.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.ucl2627.collection.features.spreads.title',
          description: 'album.editorial.ucl2627.collection.features.spreads.description',
        },
        {
          title: 'album.editorial.ucl2627.collection.features.roster.title',
          description: 'album.editorial.ucl2627.collection.features.roster.description',
        },
        {
          title: 'album.editorial.ucl2627.collection.features.progress.title',
          description: 'album.editorial.ucl2627.collection.features.progress.description',
        },
      ],
    },
  ],
  layout: {
    openStartPage: 1,
    contentsFirstPage: 4,
    contentsLastPage: 7,
    contentsPageSize: 9,
    contentsVariant: 'flat',
    contentsColumns: 3,
  },
  dropSettings: {
    poolId: 'ucl-26-27-standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  blisters: [toBlisterDefinition(BLISTER_CONFIGS.ucl)],
  metadata: { kind: 'squads', season: '2026/27', clubs: ucl2627Contents.length },
}

const rpl2627Album: AlbumDefinition = {
  id: 'rpl-26-27',
  name: 'album.library.items.rpl-26-27.title',
  shortName: 'album.library.items.rpl-26-27.shortTitle',
  description: 'album.library.items.rpl-26-27.description',
  route: '/album/rpl-26-27',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-coral',
  },
  geometry: rpl2627Geometry,
  pages: rpl2627Geometry.pages,
  spreads: createSpreads('rpl-26-27', rpl2627Geometry.pages.map(({ id }) => id)),
  cards: rpl2627Cards,
  catalogs: rpl2627Catalogs,
  contents: rpl2627Contents,
  editorialPages: [
    {
      pageId: 'rpl-26-27-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.rpl2627.cover.eyebrow',
      title: 'album.editorial.rpl2627.cover.title',
      description: 'album.editorial.rpl2627.cover.description',
      footer: 'album.editorial.rpl2627.cover.footer',
      tone: 'dark',
    },
    {
      pageId: 'rpl-26-27-info',
      kind: 'article',
      eyebrow: 'album.editorial.rpl2627.info.eyebrow',
      title: 'album.editorial.rpl2627.info.title',
      description: 'album.editorial.rpl2627.info.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.rpl2627.info.features.clubs.title',
          description: 'album.editorial.rpl2627.info.features.clubs.description',
        },
        {
          title: 'album.editorial.rpl2627.info.features.cards.title',
          description: 'album.editorial.rpl2627.info.features.cards.description',
        },
        {
          title: 'album.editorial.rpl2627.info.features.format.title',
          description: 'album.editorial.rpl2627.info.features.format.description',
        },
      ],
    },
    {
      pageId: 'rpl-26-27-details',
      kind: 'article',
      eyebrow: 'album.editorial.rpl2627.details.eyebrow',
      title: 'album.editorial.rpl2627.details.title',
      description: 'album.editorial.rpl2627.details.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.rpl2627.details.features.spreads.title',
          description: 'album.editorial.rpl2627.details.features.spreads.description',
        },
        {
          title: 'album.editorial.rpl2627.details.features.rosters.title',
          description: 'album.editorial.rpl2627.details.features.rosters.description',
        },
        {
          title: 'album.editorial.rpl2627.details.features.navigation.title',
          description: 'album.editorial.rpl2627.details.features.navigation.description',
        },
      ],
    },
  ],
  layout: {
    openStartPage: 1,
    contentsFirstPage: 4,
    contentsLastPage: 5,
    contentsPageSize: 8,
    contentsVariant: 'flat',
    contentsColumns: 4,
    contentsTone: 'dark',
    contentsTranslationScope: 'rpl',
  },
  dropSettings: {
    poolId: 'rpl-26-27-standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  blisters: [toBlisterDefinition(BLISTER_CONFIGS.rpl)],
  metadata: { kind: 'squads', season: '2026/27', clubs: rpl2627Contents.length },
}

const spainClubsLogoAlbum: AlbumDefinition = {
  id: 'spainClubsLogo',
  name: 'album.library.items.spainClubsLogo.title',
  shortName: 'album.library.items.spainClubsLogo.shortTitle',
  description: 'album.library.items.spainClubsLogo.description',
  route: '/album/spainClubsLogo',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-coral',
  },
  geometry: spainClubsLogoGeometry,
  pages: spainClubsLogoGeometry.pages,
  spreads: createSpreads('spainClubsLogo', spainClubsLogoGeometry.pages.map(({ id }) => id)),
  cards: spainClubsLogoCards,
  catalogs: spainClubsLogoCatalogs,
  contents: [],
  editorialPages: [
    {
      pageId: 'spain-clubs-logo-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.spainClubsLogo.cover.eyebrow',
      title: 'album.editorial.spainClubsLogo.cover.title',
      description: 'album.editorial.spainClubsLogo.cover.description',
      footer: 'album.editorial.spainClubsLogo.cover.footer',
      tone: 'dark',
    },
    {
      pageId: 'spain-clubs-logo-history',
      kind: 'article',
      eyebrow: 'album.editorial.spainClubsLogo.history.eyebrow',
      title: 'album.editorial.spainClubsLogo.history.title',
      description: 'album.editorial.spainClubsLogo.history.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.spainClubsLogo.history.features.pyramid.title',
          description: 'album.editorial.spainClubsLogo.history.features.pyramid.description',
        },
        {
          title: 'album.editorial.spainClubsLogo.history.features.groups.title',
          description: 'album.editorial.spainClubsLogo.history.features.groups.description',
        },
        {
          title: 'album.editorial.spainClubsLogo.history.features.identity.title',
          description: 'album.editorial.spainClubsLogo.history.features.identity.description',
        },
        {
          title: 'album.editorial.spainClubsLogo.history.features.geography.title',
          description: 'album.editorial.spainClubsLogo.history.features.geography.description',
        },
      ],
    },
    {
      pageId: 'spain-clubs-logo-guide',
      kind: 'article',
      eyebrow: 'album.editorial.spainClubsLogo.guide.eyebrow',
      title: 'album.editorial.spainClubsLogo.guide.title',
      description: 'album.editorial.spainClubsLogo.guide.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.spainClubsLogo.guide.features.sections.title',
          description: 'album.editorial.spainClubsLogo.guide.features.sections.description',
        },
        {
          title: 'album.editorial.spainClubsLogo.guide.features.spreads.title',
          description: 'album.editorial.spainClubsLogo.guide.features.spreads.description',
        },
        {
          title: 'album.editorial.spainClubsLogo.guide.features.navigation.title',
          description: 'album.editorial.spainClubsLogo.guide.features.navigation.description',
        },
      ],
    },
    {
      pageId: 'spain-clubs-logo-contents',
      kind: 'contents',
      eyebrow: 'album.editorial.spainClubsLogo.contents.eyebrow',
      title: 'album.editorial.spainClubsLogo.contents.title',
      description: 'album.editorial.spainClubsLogo.contents.description',
      contentsVariant: 'logo-grid',
      contentsFirstPage: 4,
      contentsPageSize: 7,
      continuationPageIds: [
        'spain-clubs-logo-contents-2',
        'spain-clubs-logo-contents-3',
        'spain-clubs-logo-contents-4',
      ],
      contentsSections: shiftContentsPages([
        {
          title: 'album.editorial.spainClubsLogo.contents.sections.main',
          items: [
            { label: 'album.editorial.spainClubsLogo.contents.labels.laLiga', logo: '/leagueLogos/spain/la-liga.png', pages: '04–05', targetPage: 4 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.segunda', logo: '/leagueLogos/spain/la-liga-2.png', pages: '06–09', targetPage: 6 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.primera', logo: '/leagueLogos/spain/primera-federacion.png', group: 'Grupo 1', pages: '10–11', targetPage: 10 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.primera', logo: '/leagueLogos/spain/primera-federacion.png', group: 'Grupo 2', pages: '12–13', targetPage: 12 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.segundaFederacion', logo: '/leagueLogos/spain/segunda-federacion.png', group: 'Grupo 1', pages: '14–15', targetPage: 14 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.segundaFederacion', logo: '/leagueLogos/spain/segunda-federacion.png', group: 'Grupo 2', pages: '16–17', targetPage: 16 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.segundaFederacion', logo: '/leagueLogos/spain/segunda-federacion.png', group: 'Grupo 3', pages: '18–19', targetPage: 18 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.segundaFederacion', logo: '/leagueLogos/spain/segunda-federacion.png', group: 'Grupo 4', pages: '20–21', targetPage: 20 },
            { label: 'album.editorial.spainClubsLogo.contents.labels.segundaFederacion', logo: '/leagueLogos/spain/segunda-federacion.png', group: 'Grupo 5', pages: '22–23', targetPage: 22 },
          ],
        },
        {
          title: 'album.editorial.spainClubsLogo.contents.sections.terceraFirst',
          items: Array.from({ length: 9 }, (_value, index) => ({
            label: 'album.editorial.spainClubsLogo.contents.labels.tercera',
            logo: '/leagueLogos/spain/tercera-federacion.png',
            group: `Grupo ${String(index + 1).padStart(2, '0')}`,
            pages: `${String(24 + index * 2).padStart(2, '0')}–${String(25 + index * 2).padStart(2, '0')}`,
            targetPage: 24 + index * 2,
          })),
        },
        {
          title: 'album.editorial.spainClubsLogo.contents.sections.terceraSecond',
          items: Array.from({ length: 9 }, (_value, index) => ({
            label: 'album.editorial.spainClubsLogo.contents.labels.tercera',
            logo: '/leagueLogos/spain/tercera-federacion.png',
            group: `Grupo ${String(index + 10).padStart(2, '0')}`,
            pages: `${42 + index * 2}–${43 + index * 2}`,
            targetPage: 42 + index * 2,
          })),
        },
      ], 4),
    },
  ],
  layout: {
    openStartPage: 1,
  },
  dropSettings: {
    poolId: 'spain-clubs-logo-development',
    rarityOdds: spainClubsLogoRarityOdds,
  },
  blisters: [
    toBlisterDefinition(BLISTER_CONFIGS.spainLogos, spainClubsLogoRarityOdds),
  ],
  metadata: {
    kind: 'club-logos',
    countries: Array.from(
      new Set(
        spainClubsLogoCards.flatMap((card) =>
          card.kind === 'team' && card.country ? [card.country] : [],
        ),
      ),
    ),
    leagues: Array.from(
      new Set(
        spainClubsLogoCards.flatMap((card) =>
          card.kind === 'team' && card.leagueId ? [card.leagueId] : [],
        ),
      ),
    ),
  },
}

const russiaClubsLogoAlbum: AlbumDefinition = {
  id: 'russiaClubsLogo',
  name: 'album.library.items.russiaClubsLogo.title',
  shortName: 'album.library.items.russiaClubsLogo.shortTitle',
  description: 'album.library.items.russiaClubsLogo.description',
  route: '/album/russiaClubsLogo',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-coral',
  },
  geometry: russiaClubsLogoGeometry,
  pages: russiaClubsLogoGeometry.pages,
  spreads: createSpreads('russiaClubsLogo', russiaClubsLogoGeometry.pages.map(({ id }) => id)),
  cards: russiaClubsLogoCards,
  catalogs: russiaClubsLogoCatalogs,
  contents: [],
  editorialPages: [
    {
      pageId: 'russia-clubs-logo-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.russiaClubsLogo.cover.eyebrow',
      title: 'album.editorial.russiaClubsLogo.cover.title',
      description: 'album.editorial.russiaClubsLogo.cover.description',
      footer: 'album.editorial.russiaClubsLogo.cover.footer',
      tone: 'dark',
    },
    {
      pageId: 'russia-clubs-logo-history',
      kind: 'article',
      eyebrow: 'album.editorial.russiaClubsLogo.history.eyebrow',
      title: 'album.editorial.russiaClubsLogo.history.title',
      description: 'album.editorial.russiaClubsLogo.history.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.russiaClubsLogo.history.features.pyramid.title',
          description: 'album.editorial.russiaClubsLogo.history.features.pyramid.description',
        },
        {
          title: 'album.editorial.russiaClubsLogo.history.features.divisionA.title',
          description: 'album.editorial.russiaClubsLogo.history.features.divisionA.description',
        },
        {
          title: 'album.editorial.russiaClubsLogo.history.features.divisionB.title',
          description: 'album.editorial.russiaClubsLogo.history.features.divisionB.description',
        },
        {
          title: 'album.editorial.russiaClubsLogo.history.features.identity.title',
          description: 'album.editorial.russiaClubsLogo.history.features.identity.description',
        },
      ],
    },
    {
      pageId: 'russia-clubs-logo-guide',
      kind: 'article',
      eyebrow: 'album.editorial.russiaClubsLogo.guide.eyebrow',
      title: 'album.editorial.russiaClubsLogo.guide.title',
      description: 'album.editorial.russiaClubsLogo.guide.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.russiaClubsLogo.guide.features.divisions.title',
          description: 'album.editorial.russiaClubsLogo.guide.features.divisions.description',
        },
        {
          title: 'album.editorial.russiaClubsLogo.guide.features.cards.title',
          description: 'album.editorial.russiaClubsLogo.guide.features.cards.description',
        },
        {
          title: 'album.editorial.russiaClubsLogo.guide.features.navigation.title',
          description: 'album.editorial.russiaClubsLogo.guide.features.navigation.description',
        },
      ],
    },
    {
      pageId: 'russia-clubs-logo-contents',
      kind: 'contents',
      eyebrow: 'album.editorial.russiaClubsLogo.contents.eyebrow',
      title: 'album.editorial.russiaClubsLogo.contents.title',
      description: 'album.editorial.russiaClubsLogo.contents.description',
      contentsVariant: 'logo-grid',
      contentsFirstPage: 4,
      contentsPageSize: 5,
      continuationPageIds: ['russia-clubs-logo-contents-2'],
      contentsSections: shiftContentsPages([
        {
          title: 'album.editorial.russiaClubsLogo.contents.sections.national',
          items: [
            { label: 'album.editorial.russiaClubsLogo.contents.labels.rpl', logo: '/leagueLogos/russia/rpl.png', pages: '04–05', targetPage: 4 },
            { label: 'album.editorial.russiaClubsLogo.contents.labels.firstLeague', logo: '/leagueLogos/russia/first-league.png', pages: '06–07', targetPage: 6 },
            { label: 'album.editorial.russiaClubsLogo.contents.labels.secondA', logo: '/leagueLogos/russia/second-league.png', group: 'Золото', pages: '08–09', targetPage: 8 },
            { label: 'album.editorial.russiaClubsLogo.contents.labels.secondA', logo: '/leagueLogos/russia/second-league.png', group: 'Серебро', pages: '10–11', targetPage: 10 },
          ],
        },
        {
          title: 'album.editorial.russiaClubsLogo.contents.sections.secondB',
          items: Array.from({ length: 4 }, (_value, index) => ({
            label: 'album.editorial.russiaClubsLogo.contents.labels.secondB',
            logo: '/leagueLogos/russia/second-league.png',
            group: `Группа ${index + 1}`,
            pages: `${12 + index * 2}–${13 + index * 2}`,
            targetPage: 12 + index * 2,
          })),
        },
        {
          title: 'album.editorial.russiaClubsLogo.contents.sections.mediaLeague',
          items: [
            { label: 'album.editorial.russiaClubsLogo.contents.labels.mediaLeague', logo: '/leagueLogos/russia/media-league.png', pages: '20–21', targetPage: 20 },
          ],
        },
      ], 2),
    },
  ],
  layout: {
    openStartPage: 1,
  },
  dropSettings: {
    poolId: 'russia-clubs-logo-standard',
    rarityOdds: russiaClubsLogoRarityOdds,
  },
  blisters: [
    toBlisterDefinition(BLISTER_CONFIGS.russiaLogos, russiaClubsLogoRarityOdds),
  ],
  metadata: {
    kind: 'club-logos',
    season: '2026/27',
    countries: ['Россия', 'Абхазия'],
    leagues: ['rus1', 'rus2', 'rus3', 'rus4', 'rusmfl'],
    clubs: 125,
  },
}

const englandClubsLogoAlbum: AlbumDefinition = {
  id: 'englandClubsLogo',
  name: 'album.library.items.englandClubsLogo.title',
  shortName: 'album.library.items.englandClubsLogo.shortTitle',
  description: 'album.library.items.englandClubsLogo.description',
  route: '/album/englandClubsLogo',
  theme: {
    coverImage: 'info/cover.webp',
    previewImage: 'info/cover.webp',
    accentClass: 'text-coral',
  },
  geometry: englandClubsLogoGeometry,
  pages: englandClubsLogoGeometry.pages,
  spreads: createSpreads('englandClubsLogo', englandClubsLogoGeometry.pages.map(({ id }) => id)),
  cards: englandClubsLogoCards,
  catalogs: englandClubsLogoCatalogs,
  contents: [],
  editorialPages: [
    {
      pageId: 'england-clubs-logo-cover',
      kind: 'cover',
      eyebrow: 'album.editorial.englandClubsLogo.cover.eyebrow',
      title: 'album.editorial.englandClubsLogo.cover.title',
      description: 'album.editorial.englandClubsLogo.cover.description',
      footer: 'album.editorial.englandClubsLogo.cover.footer',
      tone: 'light',
    },
    {
      pageId: 'england-clubs-logo-history',
      kind: 'article',
      eyebrow: 'album.editorial.englandClubsLogo.history.eyebrow',
      title: 'album.editorial.englandClubsLogo.history.title',
      description: 'album.editorial.englandClubsLogo.history.description',
      align: 'left',
      features: [
        {
          title: 'album.editorial.englandClubsLogo.history.features.pyramid.title',
          description: 'album.editorial.englandClubsLogo.history.features.pyramid.description',
        },
        {
          title: 'album.editorial.englandClubsLogo.history.features.nls.title',
          description: 'album.editorial.englandClubsLogo.history.features.nls.description',
        },
        {
          title: 'album.editorial.englandClubsLogo.history.features.logos.title',
          description: 'album.editorial.englandClubsLogo.history.features.logos.description',
        },
        {
          title: 'album.editorial.englandClubsLogo.fullIssue.featureTitle',
          description: 'album.editorial.englandClubsLogo.fullIssue.featureDescription',
        },
      ],
    },
    {
      pageId: 'england-clubs-logo-guide',
      kind: 'article',
      eyebrow: 'album.editorial.englandClubsLogo.guide.eyebrow',
      title: 'album.editorial.englandClubsLogo.guide.title',
      description: 'album.editorial.englandClubsLogo.guide.description',
      align: 'right',
      features: [
        {
          title: 'album.editorial.englandClubsLogo.guide.features.levels.title',
          description: 'album.editorial.englandClubsLogo.guide.features.levels.description',
        },
        {
          title: 'album.editorial.englandClubsLogo.guide.features.issue.title',
          description: 'album.editorial.englandClubsLogo.guide.features.issue.description',
        },
        {
          title: 'album.editorial.englandClubsLogo.guide.features.navigation.title',
          description: 'album.editorial.englandClubsLogo.guide.features.navigation.description',
        },
      ],
    },
    {
      pageId: 'england-clubs-logo-contents',
      kind: 'contents',
      eyebrow: 'album.editorial.englandClubsLogo.contents.eyebrow',
      title: 'album.editorial.englandClubsLogo.contents.title',
      description: 'album.editorial.englandClubsLogo.fullIssue.contentsDescription',
      contentsVariant: 'logo-grid',
      contentsFirstPage: 4,
      contentsPageSize: 13,
      continuationPageIds: [
        'england-clubs-logo-contents-2',
        'england-clubs-logo-contents-3',
        'england-clubs-logo-contents-4',
      ],
      contentsSections: [
        { title: 'professional', levels: [1, 2, 3, 4] },
        { title: 'national', levels: [5, 6] },
        { title: 'step3', levels: [7] },
        { title: 'step4', levels: [8] },
        { title: 'step5', levels: [9] },
        { title: 'step6', levels: [10] },
      ].map(({ title, levels }) => ({
        title: `album.editorial.englandClubsLogo.contents.sections.${title}`,
        items: englandDivisionPageRanges
          .filter(({ level }) => levels.includes(level))
          .map(({ division, endPage, logo, startPage }) => ({
            logo,
            label: division,
            pages: `${String(startPage).padStart(2, '0')}–${String(endPage).padStart(2, '0')}`,
            targetPage: startPage,
            translateLabel: false,
          })),
      })),
    },
  ],
  layout: { openStartPage: 1 },
  dropSettings: {
    poolId: 'england-clubs-logo-standard',
    rarityOdds: englandClubsLogoRarityOdds,
  },
  blisters: [
    toBlisterDefinition(BLISTER_CONFIGS.englandLogos, englandClubsLogoRarityOdds),
  ],
  metadata: {
    kind: 'club-logos',
    season: '2026/27',
    countries: ['England'],
    leagues: ['eng1', 'eng2', 'eng3', 'eng4', 'eng5', 'eng6', 'eng7', 'eng8', 'eng9', 'eng10'],
    clubs: 795,
  },
}

const definitions: AlbumDefinition[] = [
  infoAlbum,
  wc26Album,
  ucl2627Album,
  rpl2627Album,
  tomskAlbum,
  spainClubsLogoAlbum,
  russiaClubsLogoAlbum,
  englandClubsLogoAlbum,
]
const registry: ReadonlyMap<AlbumId, AlbumDefinition> = new Map(
  definitions.map((album): [AlbumId, AlbumDefinition] => [album.id, album]),
)
const blisters: ReadonlyMap<string, BlisterDefinition> = new Map(
  definitions.flatMap((album) =>
    album.blisters.map((blister): [string, BlisterDefinition] => [blister.id, blister]),
  ),
)
// Проверяет все межфайловые связи до того, как конфигурация попадёт в интерфейс.
const validateAlbum = (album: AlbumDefinition): void => {
  const assetAlbumId: string =
    typeof album.metadata.assetAlbumId === 'string' ? album.metadata.assetAlbumId : album.id
  const cardAssetAlbumIds: string[] = Array.isArray(album.metadata.cardAssetAlbumIds)
    ? album.metadata.cardAssetAlbumIds.filter(
        (id: unknown): id is string => typeof id === 'string',
      )
    : [
        typeof album.metadata.cardAssetAlbumId === 'string'
          ? album.metadata.cardAssetAlbumId
          : assetAlbumId,
      ]
  const allowEmptySlots: boolean = album.metadata.allowEmptySlots === true
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
    if (
      !cardAssetAlbumIds.some((cardAssetAlbumId) =>
        card.image.includes(`/${cardAssetAlbumId}/cards/`),
      )
    ) {
      throw new Error(`${album.id}: card ${card.id} has an invalid image path`)
    }
  }
  for (const page of album.pages) {
    if (!hasAlbumPageAsset(assetAlbumId, page.image)) {
      throw new Error(`${album.id}: page ${page.id} references a missing image`)
    }
  }
  for (const slot of slots) {
    if (!allowEmptySlots && !knownCards.has(slot.playerId)) {
      throw new Error(`${album.id}: slot ${slot.id} references unknown card ${slot.playerId}`)
    }
  }
  for (const spread of album.spreads) {
    if (
      spread.pageIds.some(
        (pageId): boolean => pageId !== undefined && !pageIds.includes(pageId),
      )
    ) {
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
export const getPlayerAlbums = (): readonly AlbumDefinition[] =>
  definitions.filter(({ metadata }): boolean => metadata.playerAccessible !== false)
export const getLibraryAlbums = (): readonly AlbumDefinition[] =>
  getPlayerAlbums().filter(
    ({ id }): boolean => ALBUM_VISIBILITY_CONFIG[id] !== false,
  )
export const getAlbumById = (albumId: AlbumId): AlbumDefinition | undefined =>
  registry.get(albumId)
export const getPlayerAlbumById = (albumId: AlbumId): AlbumDefinition | undefined => {
  const album: AlbumDefinition | undefined = getAlbumById(albumId)
  return album?.metadata.playerAccessible === false ? undefined : album
}
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
export const getPlayerAlbumCard = (
  albumId: AlbumId,
  cardId: string,
): CardDefinition | undefined =>
  getPlayerAlbumById(albumId)?.cards.find(({ id }) => id === cardId)
export const getBlisterById = (blisterId: string): BlisterDefinition | undefined =>
  blisters.get(blisterId)
export const getPlayerBlisterById = (blisterId: string): BlisterDefinition | undefined => {
  const blister: BlisterDefinition | undefined = getBlisterById(blisterId)
  return blister && getPlayerAlbumById(blister.albumId) ? blister : undefined
}
export const getBlisters = (): readonly BlisterDefinition[] =>
  Array.from(blisters.values()).filter(({ albumId }): boolean =>
    Boolean(getPlayerAlbumById(albumId)),
  )

export const createEmptyAlbumProgress = (albumId: AlbumId): AlbumProgress => ({
  albumId,
  totalCards: getAlbumById(albumId)?.cards.length ?? 0,
  collectedCards: 0,
  placedCards: 0,
  duplicateCards: 0,
  completionPercent: 0,
})
