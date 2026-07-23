import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type ImageSource = 'default' | 'last-stickers'

interface CardEntry {
  cardNumber: string
  image: string
}

interface CardCatalog {
  teamId: string
  cards: CardEntry[]
}

const source = process.argv[2] as ImageSource | undefined

if (source !== 'default' && source !== 'last-stickers') {
  throw new Error('Usage: set-card-image-source.ts <default|last-stickers>')
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(scriptDirectory, '../src/data/wc-26')
const baseCardNumberPattern = /^\d+$/

const findCatalogs = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedCatalogs = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return findCatalogs(entryPath)
      }

      return entry.isFile() && entry.name === 'cards.json' ? [entryPath] : []
    }),
  )

  return nestedCatalogs.flat().sort()
}

const buildImagePath = (teamId: string, fileName: string): string => {
  const directory = source === 'last-stickers' ? `/cards/${teamId}/lastStickers` : `/cards/${teamId}`

  return `${directory}/${fileName}`
}

const updateCatalog = async (catalogPath: string): Promise<number> => {
  const json = await readFile(catalogPath, 'utf8')
  const catalog = JSON.parse(json) as CardCatalog
  let updatedCards = 0

  for (const card of catalog.cards) {
    if (!baseCardNumberPattern.test(card.cardNumber)) {
      continue
    }

    const fileName = path.posix.basename(card.image)
    const image = buildImagePath(catalog.teamId, fileName)

    if (card.image !== image) {
      card.image = image
      updatedCards += 1
    }
  }

  if (updatedCards > 0) {
    const newline = json.includes('\r\n') ? '\r\n' : '\n'
    await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}${newline}`, 'utf8')
  }

  return updatedCards
}

const catalogPaths = await findCatalogs(dataDirectory)
const updateCounts = await Promise.all(catalogPaths.map(updateCatalog))
const updatedCards = updateCounts.reduce((total, count) => total + count, 0)

console.log(
  `Image source set to "${source}" in ${catalogPaths.length} catalog(s); ${updatedCards} card path(s) updated.`,
)
