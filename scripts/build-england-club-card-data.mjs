import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const dataRoot = path.join(projectRoot, 'src/data/englandClubsLogo/england')
const structure = JSON.parse(await fs.readFile(path.join(dataRoot, 'structure.json'), 'utf8'))
const sources = JSON.parse(await fs.readFile(path.join(dataRoot, 'logo-sources.json'), 'utf8'))
const metadataPath = path.join(dataRoot, 'club-metadata.json')
const logoJobsPath = path.join(dataRoot, 'logo-jobs.json')
const shouldRefreshMetadata = process.argv.includes('--refresh-metadata')

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const chunks = (values, size) => Array.from(
  { length: Math.ceil(values.length / size) },
  (_value, index) => values.slice(index * size, (index + 1) * size),
)

const clubs = structure.divisions.flatMap((division) => division.clubs.map((club) => ({
  ...club,
  level: division.level,
  league: division.league,
  division: division.division,
  section: division.section,
})))
const clubsById = new Map(clubs.map((club) => [club.id, club]))
const resolvedSources = sources.filter(({ status, sourceUrl }) => status === 'resolved' && sourceUrl)

const decodeEntities = (value) => value
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&ndash;|&mdash;/gi, '–')
  .replace(/&#39;|&apos;/gi, "'")

const stripWikiMarkup = (value = '') => decodeEntities(value)
  .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^/>]*\/>/gi, '')
  .replace(/<br\s*\/?>/gi, ', ')
  .replace(/\{\{(?:nowrap|small|ubl|plainlist)\|([^{}]*)\}\}/gi, '$1')
  .replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '')
  .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/'{2,}/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s*,\s*,+/g, ', ')
  .replace(/\s+/g, ' ')
  .trim()

const getInfoboxField = (content, field) => {
  const match = content.match(new RegExp(`^\\|\\s*${field}\\s*=\\s*(.*)$`, 'im'))
  return match?.[1]?.trim() ?? ''
}

const getFoundedYear = (content) => {
  const rawFounded = getInfoboxField(content, 'founded')
  const years = [...rawFounded.matchAll(/\b(18\d{2}|19\d{2}|20[0-2]\d)\b/g)].map((match) => Number(match[1]))
  return years.length > 0 ? Math.min(...years) : null
}

const cleanPlace = (value) => stripWikiMarkup(value)
  .replace(/\([^)]*\)/g, '')
  .replace(/\b(?:England|United Kingdom|UK)\b/gi, '')
  .replace(/,\s*(?:which|and affiliated|a club|who|where|currently|and competes)\b.*$/i, '')
  .replace(/\s+and\s+(?:competes|plays|is affiliated)\b.*$/i, '')
  .replace(/^\s*[,–-]\s*|\s*[,–-]\s*$/g, '')
  .trim()

const getGroundAndCity = (content, club) => {
  const rawGround = getInfoboxField(content, 'ground') || getInfoboxField(content, 'stadium')
  const cleanedGround = stripWikiMarkup(rawGround)
  const groundParts = cleanedGround.split(/\s*,\s*/).filter(Boolean)
  const stadium = (groundParts[0] || club.stadium || 'Club Ground').trim()
  let city = cleanPlace(groundParts.at(-1) ?? '')
  if (!city || city.toLowerCase() === stadium.toLowerCase()) {
    const plainLead = stripWikiMarkup(content.slice(0, 7000))
    const basedMatch = plainLead.match(/\bbased in\s+([^.;]+?)(?:,\s*England)?[.;]/i)
    city = cleanPlace(basedMatch?.[1] ?? '')
  }
  if (!city) city = club.city || club.displayName.replace(/\b(?:AFC|FC|F\.C\.|Town|City|United|Athletic)\b/gi, '').trim()
  return { stadium, city: city || 'England' }
}

const fetchPageContents = async (titles) => {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.search = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    redirects: '1',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'user-agent': 'StickerBook/1.10 (club card metadata)' } })
    if (response.ok) {
      const result = await response.json()
      return new Map((result.query?.pages ?? []).map((page) => [
        page.title,
        page.revisions?.[0]?.slots?.main?.content ?? '',
      ]))
    }
    if (attempt === 5) throw new Error(`Metadata request failed: ${response.status}`)
    await delay(attempt * 2_000)
  }
}

let metadata = []
try {
  if (shouldRefreshMetadata) throw Object.assign(new Error('Refresh'), { code: 'ENOENT' })
  metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const metadataById = new Map(metadata.map((entry) => [entry.id, entry]))

const pendingSources = resolvedSources.filter(({ id }) => !metadataById.has(id))
for (const [batchIndex, batch] of chunks(pendingSources, 40).entries()) {
  const pageContents = await fetchPageContents(batch.map(({ articleTitle }) => articleTitle))
  for (const source of batch) {
    const club = clubsById.get(source.id)
    const content = pageContents.get(source.articleTitle) ?? ''
    const { stadium, city } = getGroundAndCity(content, club)
    metadataById.set(source.id, {
      id: source.id,
      displayName: club.displayName,
      foundedYear: getFoundedYear(content) ?? 1900,
      stadium,
      city,
      articleTitle: source.articleTitle,
    })
  }
  metadata = resolvedSources.map(({ id }) => metadataById.get(id)).filter(Boolean)
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  console.log(`metadata batch=${batchIndex + 1}/${Math.ceil(pendingSources.length / 40)} entries=${metadata.length}`)
  await delay(1_000)
}

const logoJobs = []
for (const division of structure.divisions) {
  const sectionCards = []
  for (const club of division.clubs) {
    const source = resolvedSources.find(({ id }) => id === club.id)
    const clubMetadata = metadataById.get(club.id)
    if (!source || !clubMetadata) continue
    const fileStem = `${club.id.toUpperCase()}-${club.slug}`
    const logo = `/englandClubsLogo/logos/england/${division.section}/${fileStem}.png`
    const image = `/englandClubsLogo/cards/england/${division.section}/${fileStem}.webp`
    sectionCards.push({
      id: club.id,
      cardNumber: String(club.albumSlot).padStart(2, '0'),
      albumSlot: club.albumSlot,
      displayName: club.displayName,
      city: clubMetadata.city,
      country: 'England',
      foundedYear: clubMetadata.foundedYear,
      stadium: clubMetadata.stadium,
      leagueId: `eng${division.level}`,
      countryCode: 'ENG',
      image,
      series: 'base',
      finish: 'standard',
      rarity: 'uncommon',
      kind: 'team',
    })
    logoJobs.push({
      id: club.id,
      slug: club.slug,
      section: division.section,
      displayName: club.displayName,
      leagueLabel: division.league,
      logo,
    })
  }
  if (sectionCards.length > 0) {
    const sectionRoot = path.join(dataRoot, division.section)
    await fs.mkdir(sectionRoot, { recursive: true })
    await fs.writeFile(path.join(sectionRoot, 'cards.json'), `${JSON.stringify(sectionCards, null, 2)}\n`, 'utf8')
  }
}

await fs.writeFile(logoJobsPath, `${JSON.stringify(logoJobs, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ cards: logoJobs.length, divisions: structure.divisions.length }))
