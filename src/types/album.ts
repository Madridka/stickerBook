import type { NormalizedCardCatalog, CardDefinition, CardRarity } from './cardCatalog'
import type { AlbumGeometryData, AlbumGeometryPage } from './index'

export type AlbumId = string
export type CardId = string
export type PageId = string

export interface AlbumContentsItem {
  id: string
  flag: string
  pageId: PageId
  nameKey: string
  group: string
}

export interface AlbumSpread {
  id: string
  pageIds: [PageId, PageId?]
}

export interface AlbumTheme {
  coverImage: string
  previewImage: string
  logoImage?: string
  accentClass?: string
}

export type AlbumEditorialPageKind = 'cover' | 'article' | 'contents' | 'changelog'
export type AlbumEditorialPageAlign = 'left' | 'right'
export type AlbumEditorialPageTone = 'light' | 'dark'

export interface AlbumEditorialFeature {
  title: string
  description: string
}

export interface AlbumEditorialContentsItem {
  label: string
  pages: string
  targetPage: number
  group?: string
}

export interface AlbumEditorialContentsSection {
  title: string
  items: AlbumEditorialContentsItem[]
}

export interface AlbumEditorialPageDefinition {
  pageId: PageId
  kind: AlbumEditorialPageKind
  eyebrow: string
  title: string
  description: string
  features?: AlbumEditorialFeature[]
  contentsSections?: AlbumEditorialContentsSection[]
  align?: AlbumEditorialPageAlign
  tone?: AlbumEditorialPageTone
  footer?: string
}

export interface AlbumLayout {
  openStartPage: number
  contentsFirstPage?: number
  contentsLastPage?: number
  contentsPageSize?: number
}

export interface AlbumDropSettings {
  poolId: string
  rarityOdds: Record<CardRarity, number>
}

export interface BlisterDefinition {
  id: string
  albumId: AlbumId
  titleKey: string
  cost: number
  cardCount: number
  cooldownMs: number
  poolId: string
  rarityOdds: Record<CardRarity, number>
}

export interface AlbumDefinition<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  id: AlbumId
  name: string
  shortName: string
  description: string
  route: string
  theme: AlbumTheme
  geometry: AlbumGeometryData
  pages: AlbumGeometryPage[]
  spreads: AlbumSpread[]
  cards: CardDefinition[]
  catalogs: NormalizedCardCatalog[]
  contents: AlbumContentsItem[]
  editorialPages: AlbumEditorialPageDefinition[]
  layout: AlbumLayout
  dropSettings: AlbumDropSettings
  blisters: BlisterDefinition[]
  metadata: TMetadata
}

export interface AlbumProgress {
  albumId: AlbumId
  totalCards: number
  collectedCards: number
  placedCards: number
  duplicateCards: number
  completionPercent: number
}

export type AlbumCard = CardDefinition
export type AlbumPage = AlbumGeometryPage
