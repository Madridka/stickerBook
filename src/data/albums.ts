import { journals } from '@/features/journals/registry'
import type { JournalDefinition } from '@/features/journals/types'

export type AlbumCatalogItem = JournalDefinition

const albums: AlbumCatalogItem[] = journals

export default { albums }
