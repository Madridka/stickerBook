import fs from 'node:fs'
import path from 'node:path'

interface CatalogCard {
  cardNumber: string
  displayName: string
  image: string
  kind: 'team' | 'coach' | 'player' | 'special'
  personId?: string
  position?: 'GK' | 'DF' | 'MF' | 'FW'
}

interface CatalogFile {
  teamId: string
  cards: CatalogCard[]
}

const ROOT = process.cwd()
const DATA_ROOT = path.join(ROOT, 'src', 'data', 'ucl-26-27')
const PUBLIC_ROOT = path.join(ROOT, 'public')
const SOURCE_ROOT = path.join(PUBLIC_ROOT, 'ucl-26-27', 'card-sources')
const PORTRAIT_CACHE = path.join(PUBLIC_ROOT, 'ucl-26-27', 'portrait-cache')
const TEMPLATE = path.join(PUBLIC_ROOT, 'examples', 'ucl', 'ucl-26-27-clean-no-crest-source.png')
const JUDE_EXAMPLE = path.join(
  PUBLIC_ROOT,
  'examples',
  'ucl',
  'jude-bellingham-real-madrid-card-source.png',
)

const clubs: Record<string, { code: string; shortName: string; primary: string; secondary: string }> = {
  'real-madrid': { code: 'RMA', shortName: 'REAL MADRID', primary: '#f5c84b', secondary: '#3154a4' },
  barcelona: { code: 'BAR', shortName: 'FC BARCELONA', primary: '#a50044', secondary: '#004d98' },
  'bayern-munich': { code: 'BAY', shortName: 'BAYERN MUNICH', primary: '#dc052d', secondary: '#0066b2' },
  'borussia-dortmund': { code: 'BVB', shortName: 'DORTMUND', primary: '#fde100', secondary: '#111111' },
  'paris-saint-germain': { code: 'PSG', shortName: 'PARIS SG', primary: '#da291c', secondary: '#004170' },
  arsenal: { code: 'ARS', shortName: 'ARSENAL', primary: '#ef0107', secondary: '#063672' },
}

const xml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const dataUriCache = new Map<string, string>()
const imageDataUri = (filePath: string): string => {
  const cached = dataUriCache.get(filePath)
  if (cached) return cached
  const extension = path.extname(filePath).slice(1).replace('jpg', 'jpeg')
  const uri = `data:image/${extension};base64,${fs.readFileSync(filePath).toString('base64')}`
  dataUriCache.set(filePath, uri)
  return uri
}

const wcPortraits = (): Map<string, string> => {
  const result = new Map<string, string>()
  const cardsRoot = path.join(PUBLIC_ROOT, 'wc-26', 'cards')
  for (const country of fs.readdirSync(cardsRoot, { withFileTypes: true })) {
    if (!country.isDirectory()) continue
    const countryRoot = path.join(cardsRoot, country.name)
    for (const filename of fs.readdirSync(countryRoot)) {
      if (!filename.endsWith('.webp')) continue
      const slug = filename.replace(/^\w+-\d+-/, '').replace(/\.webp$/, '')
      result.set(slug, path.join(countryRoot, filename))
    }
  }
  if (fs.existsSync(PORTRAIT_CACHE)) {
    for (const filename of fs.readdirSync(PORTRAIT_CACHE)) {
      if (filename.endsWith('.png')) result.set(path.basename(filename, '.png'), path.join(PORTRAIT_CACHE, filename))
    }
  }
  return result
}

const initials = (name: string): string =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('en-US') ?? '')
    .join('')

const roleLabel = (card: CatalogCard, clubName: string): string => {
  if (card.kind === 'team') return `CLUB CREST • ${clubName}`
  if (card.kind === 'coach') return `HEAD COACH • ${clubName}`
  const position = { GK: 'GOALKEEPER', DF: 'DEFENDER', MF: 'MIDFIELDER', FW: 'FORWARD' }[
    card.position ?? 'MF'
  ]
  return `${position} • ${clubName}`
}

const portraitLayer = (
  card: CatalogCard,
  source: string | undefined,
  primary: string,
  secondary: string,
): string => {
  if (source) {
    return `<image href="${imageDataUri(source)}" x="45" y="104" width="934" height="1401" preserveAspectRatio="none" clip-path="url(#portraitClip)"/>`
  }

  const monogram = card.kind === 'team' ? clubsForCard(card).code : initials(card.displayName)
  return `<g clip-path="url(#portraitClip)">
    <rect x="118" y="286" width="788" height="894" fill="url(#missingBg)"/>
    <circle cx="512" cy="615" r="150" fill="${secondary}" stroke="${primary}" stroke-width="12"/>
    <path d="M248 1165 C278 885 376 792 512 792 C648 792 746 885 776 1165 Z" fill="${secondary}" stroke="${primary}" stroke-width="12"/>
    <text x="512" y="655" text-anchor="middle" fill="#fff" font-family="Arial Narrow, Arial, sans-serif" font-size="112" font-weight="900">${xml(monogram)}</text>
  </g>`
}

let activeTeamId = ''
const clubsForCard = (_card: CatalogCard) => clubs[activeTeamId]

const buildSvg = (card: CatalogCard, teamId: string, portrait: string | undefined): string => {
  activeTeamId = teamId
  const club = clubs[teamId]
  const nameSize = card.displayName.length > 21 ? 54 : card.displayName.length > 16 ? 62 : 72
  const templateSource = card.personId === 'jude-bellingham' ? JUDE_EXAMPLE : TEMPLATE
  if (card.personId === 'jude-bellingham') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536"><image href="${imageDataUri(templateSource)}" width="1024" height="1536"/></svg>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
  <defs>
    <clipPath id="portraitClip"><path d="M150 286 H874 L906 335 V1015 L786 1180 H238 L118 1015 V335 Z"/></clipPath>
    <linearGradient id="missingBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071326"/><stop offset="0.52" stop-color="${club.secondary}" stop-opacity=".72"/><stop offset="1" stop-color="#020712"/></linearGradient>
    <linearGradient id="shield" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${club.primary}"/><stop offset="1" stop-color="${club.secondary}"/></linearGradient>
  </defs>
  <image href="${imageDataUri(TEMPLATE)}" width="1024" height="1536"/>
  ${portraitLayer(card, portrait, club.primary, club.secondary)}
  <path d="M150 286 H874 L906 335 V1015 L786 1180 H238 L118 1015 V335 Z" fill="none" stroke="#e7e8ea" stroke-width="4" opacity=".88"/>
  <path d="M110 34 H914 L970 90 V238 L914 294 H110 L54 238 V90 Z" fill="#030b1c" stroke="#e7e8ea" stroke-width="4"/>
  <path d="M86 54 H246 L286 94 V232 L246 272 H86 Z" fill="url(#shield)" stroke="#fff" stroke-width="5"/>
  <text x="185" y="188" text-anchor="middle" fill="#fff" font-family="Arial Narrow, Arial, sans-serif" font-size="70" font-weight="900">${club.code}</text>
  <text x="506" y="200" text-anchor="middle" fill="#fff" font-family="Arial Narrow, Arial, sans-serif" font-size="112" font-weight="900" letter-spacing="6">UCL</text>
  <text x="849" y="174" text-anchor="middle" fill="#fff" font-family="Arial Narrow, Arial, sans-serif" font-size="106" font-weight="900">${xml(card.cardNumber)}</text>
  <text x="849" y="226" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="4">${club.code}</text>
  <path d="M88 1192 H936 L970 1226 V1364 L936 1398 H88 L54 1364 V1226 Z" fill="#03091a" stroke="#e7e8ea" stroke-width="5"/>
  <text x="512" y="1322" text-anchor="middle" fill="#fff" stroke="#111827" stroke-width="1" paint-order="stroke" font-family="Arial Narrow, Arial, sans-serif" font-size="${nameSize}" font-weight="900" letter-spacing="1">${xml(card.displayName.toLocaleUpperCase('en-US'))}</text>
  <path d="M174 1394 H850 L884 1428 L850 1482 H174 L140 1428 Z" fill="#d8d9db" stroke="#111827" stroke-width="4"/>
  <text x="512" y="1450" text-anchor="middle" fill="#071020" font-family="Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="2">${xml(roleLabel(card, club.shortName))}</text>
  </svg>`
}

const portraitBySlug = wcPortraits()
fs.mkdirSync(SOURCE_ROOT, { recursive: true })
fs.mkdirSync(PORTRAIT_CACHE, { recursive: true })

let total = 0
let reusedPortraits = 0
let illustratedPortraits = 0
for (const teamId of Object.keys(clubs)) {
  const catalogPath = path.join(DATA_ROOT, teamId, 'cards.json')
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as CatalogFile
  const teamSourceRoot = path.join(SOURCE_ROOT, teamId)
  fs.mkdirSync(teamSourceRoot, { recursive: true })

  for (const card of catalog.cards) {
    const portrait = card.personId ? portraitBySlug.get(card.personId) : undefined
    if (portrait && path.extname(portrait) === '.webp') {
      fs.copyFileSync(portrait, path.join(PORTRAIT_CACHE, `${card.personId}.webp`))
    }
    if (portrait || card.personId === 'jude-bellingham') reusedPortraits += 1
    else illustratedPortraits += 1
    const outputName = path.basename(card.image, '.webp') + '.svg'
    fs.writeFileSync(path.join(teamSourceRoot, outputName), buildSvg(card, teamId, portrait), 'utf8')
    total += 1
  }
}

console.log(`Generated ${total} SVG card sources (${reusedPortraits} local portraits, ${illustratedPortraits} illustrated identities).`)
