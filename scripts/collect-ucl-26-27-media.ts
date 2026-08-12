import fs from 'node:fs'
import path from 'node:path'

interface CatalogCard {
  displayName: string
  kind: 'team' | 'coach' | 'player' | 'special'
  personId?: string
}

interface CatalogFile {
  teamId: string
  cards: CatalogCard[]
}

interface ClubManifest {
  clubs: Array<{ teamId: string; displayName: string }>
}

interface SearchPage {
  pageid: number
  title: string
  original?: { source: string; width: number; height: number }
  thumbnail?: { source: string; width: number; height: number }
  terms?: { description?: string[] }
}

interface MediaSource {
  key: string
  query: string
  pageTitle?: string
  pageUrl?: string
  imageUrl?: string
  localFile?: string
  description?: string
  status: 'downloaded' | 'cached' | 'missing' | 'error'
  error?: string
}

const ROOT = process.cwd()
const DATA_ROOT = path.join(ROOT, 'src', 'data', 'ucl-26-27')
const CACHE_ROOT = path.join(ROOT, 'tmp', 'ucl-26-27-portrait-cache')
const SOURCES_PATH = path.join(DATA_ROOT, 'media-sources.json')
const USER_AGENT = 'StickerBook/1.9 (UCL card asset collector; local development)'
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary'

const clubSearchTitles: Record<string, string> = {
  'real-madrid': 'Real Madrid CF',
  barcelona: 'FC Barcelona',
  'bayern-munich': 'FC Bayern Munich',
  'borussia-dortmund': 'Borussia Dortmund',
  'paris-saint-germain': 'Paris Saint-Germain FC',
  arsenal: 'Arsenal F.C.',
  'aston-villa': 'Aston Villa F.C.',
  liverpool: 'Liverpool F.C.',
  'manchester-city': 'Manchester City F.C.',
  'manchester-united': 'Manchester United F.C.',
  'atletico-madrid': 'Atlético Madrid',
  'real-betis': 'Real Betis',
  villarreal: 'Villarreal CF',
  lens: 'RC Lens',
  lille: 'Lille OSC',
  feyenoord: 'Feyenoord',
  psv: 'PSV Eindhoven',
  porto: 'FC Porto',
  sporting: 'Sporting CP',
  'club-brugge': 'Club Brugge KV',
  'slavia-praha': 'SK Slavia Prague',
  galatasaray: 'Galatasaray S.K. (football)',
  como: 'Como 1907',
  inter: 'Inter Milan',
  napoli: 'SSC Napoli',
  roma: 'AS Roma',
  'rb-leipzig': 'RB Leipzig',
  stuttgart: 'VfB Stuttgart',
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const fetchWithRetry = async (url: string, attempts = 4): Promise<Response> => {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (response.ok) return response
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }
    await sleep(350 * attempt)
  }
  throw lastError
}

const normalized = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const scorePage = (page: SearchPage, displayName: string, kind: CatalogCard['kind']): number => {
  if (!page.original && !page.thumbnail) return -1000
  const wanted = normalized(displayName)
  const title = normalized(page.title)
  const description = normalized(page.terms?.description?.join(' ') ?? '')
  let score = 0
  if (title === wanted) score += 100
  if (title.startsWith(wanted) || wanted.startsWith(title)) score += 45
  for (const token of wanted.split(' ')) if (token.length > 2 && title.includes(token)) score += 5
  if (kind === 'team') {
    if (/football|soccer|club|team/.test(description)) score += 35
    if (/women|futsal|basketball|handball|rugby/.test(description)) score -= 50
  } else {
    if (/footballer|football player|soccer player|football manager|football coach/.test(description)) score += 45
    if (/politician|musician|actor|writer|scientist/.test(description)) score -= 80
  }
  return score
}

const findWikipediaImage = async (
  displayName: string,
  kind: CatalogCard['kind'],
): Promise<{ page: SearchPage; imageUrl: string } | undefined> => {
  const summaryUrl = `${WIKIPEDIA_SUMMARY}/${encodeURIComponent(displayName.replaceAll(' ', '_'))}`
  try {
    const summaryResponse = await fetchWithRetry(summaryUrl, 2)
    const summary = (await summaryResponse.json()) as {
      type?: string
      pageid?: number
      title?: string
      description?: string
      thumbnail?: { source?: string; width?: number; height?: number }
      originalimage?: { source?: string; width?: number; height?: number }
    }
    const description = normalized(summary.description ?? '')
    const suitable = kind === 'team'
      ? /football|soccer|club|team/.test(description)
      : /footballer|football player|soccer player|football manager|football coach/.test(description)
    if (summary.type !== 'disambiguation' && suitable && (summary.thumbnail?.source || summary.originalimage?.source)) {
      const thumbnail = summary.thumbnail?.source?.replace(/\/\d+px-/, '/1200px-')
      return {
        page: {
          pageid: summary.pageid ?? 0,
          title: summary.title ?? displayName,
          original: summary.originalimage as SearchPage['original'],
          thumbnail: summary.thumbnail as SearchPage['thumbnail'],
          terms: { description: summary.description ? [summary.description] : [] },
        },
        imageUrl: thumbnail ?? summary.originalimage!.source,
      }
    }
  } catch {
    // The search endpoint below handles redirects and non-exact English titles.
  }

  const suffix = kind === 'team' ? 'football club' : kind === 'coach' ? 'football manager' : 'footballer'
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${displayName} ${suffix}`,
    gsrnamespace: '0',
    gsrlimit: '6',
    prop: 'pageimages|pageterms',
    piprop: 'original|thumbnail',
    pithumbsize: '1200',
    wbptterms: 'description',
    redirects: '1',
    format: 'json',
    origin: '*',
  })
  const response = await fetchWithRetry(`${WIKIPEDIA_API}?${params}`)
  const body = (await response.json()) as { query?: { pages?: Record<string, SearchPage> } }
  const pages = Object.values(body.query?.pages ?? {})
  pages.sort((left, right) => scorePage(right, displayName, kind) - scorePage(left, displayName, kind))
  const page = pages[0]
  if (!page || scorePage(page, displayName, kind) < 20) return undefined
  // Prefer MediaWiki's cached thumbnail: originals can be tens of megabytes
  // and are much more likely to trigger upload.wikimedia.org throttling.
  const imageUrl = page.thumbnail?.source ?? page.original?.source
  return imageUrl ? { page, imageUrl } : undefined
}

const extensionFor = (url: string, contentType: string | null): string => {
  const pathname = new URL(url).pathname.toLocaleLowerCase('en-US')
  const pathnameExtension = path.extname(pathname)
  if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(pathnameExtension)) {
    return pathnameExtension === '.jpeg' ? '.jpg' : pathnameExtension
  }
  if (contentType?.includes('png')) return '.png'
  if (contentType?.includes('webp')) return '.webp'
  if (contentType?.includes('svg')) return '.svg'
  return '.jpg'
}

const existingMedia = (key: string): string | undefined => {
  if (!fs.existsSync(CACHE_ROOT)) return undefined
  return fs
    .readdirSync(CACHE_ROOT)
    .find((filename) => path.basename(filename, path.extname(filename)) === key && filename !== 'sources.json')
}

const collectOne = async (
  key: string,
  displayName: string,
  kind: CatalogCard['kind'],
): Promise<MediaSource> => {
  const cached = existingMedia(key)
  if (cached) {
    return { key, query: displayName, localFile: cached, status: 'cached' }
  }
  try {
    const match = await findWikipediaImage(displayName, kind)
    if (!match) return { key, query: displayName, status: 'missing' }
    const response = await fetchWithRetry(match.imageUrl)
    const extension = extensionFor(match.imageUrl, response.headers.get('content-type'))
    const localFile = `${key}${extension}`
    fs.writeFileSync(path.join(CACHE_ROOT, localFile), Buffer.from(await response.arrayBuffer()))
    return {
      key,
      query: displayName,
      pageTitle: match.page.title,
      pageUrl: `https://en.wikipedia.org/?curid=${match.page.pageid}`,
      imageUrl: match.imageUrl,
      localFile,
      description: match.page.terms?.description?.[0],
      status: 'downloaded',
    }
  } catch (error) {
    return { key, query: displayName, status: 'error', error: String(error) }
  }
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(DATA_ROOT, 'manifest.json'), 'utf8'),
) as ClubManifest

const work: Array<{ key: string; displayName: string; kind: CatalogCard['kind'] }> = []
for (const club of manifest.clubs) {
  if (club.teamId === 'real-madrid') continue
  work.push({
    key: `${club.teamId}-team-logo`,
    displayName: clubSearchTitles[club.teamId] ?? club.displayName,
    kind: 'team',
  })
  const catalog = JSON.parse(
    fs.readFileSync(path.join(DATA_ROOT, club.teamId, 'cards.json'), 'utf8'),
  ) as CatalogFile
  for (const card of catalog.cards) {
    if (card.personId) work.push({ key: card.personId, displayName: card.displayName, kind: card.kind })
  }
}

fs.mkdirSync(CACHE_ROOT, { recursive: true })
const previous = fs.existsSync(SOURCES_PATH)
  ? (JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8')) as MediaSource[])
  : []
const previousByKey = new Map(previous.map((source) => [source.key, source]))
const results: MediaSource[] = []
let cursor = 0
const worker = async () => {
  while (cursor < work.length) {
    const index = cursor
    cursor += 1
    const item = work[index]
    const result = await collectOne(item.key, item.displayName, item.kind)
    if (result.status === 'cached' && previousByKey.has(item.key)) {
      results[index] = { ...previousByKey.get(item.key)!, status: 'cached' }
    } else {
      results[index] = result
    }
    if ((index + 1) % 25 === 0 || index + 1 === work.length) {
      console.log(`Media ${index + 1}/${work.length}`)
    }
    await sleep(120)
  }
}

await Promise.all(Array.from({ length: 3 }, () => worker()))
fs.writeFileSync(SOURCES_PATH, `${JSON.stringify(results, null, 2)}\n`, 'utf8')

const usable = results.filter((source) => source.status === 'downloaded' || source.status === 'cached').length
const missing = results.filter((source) => source.status === 'missing').length
const errors = results.filter((source) => source.status === 'error').length
console.log(`Collected ${usable}/${results.length} images (${missing} missing, ${errors} errors).`)
