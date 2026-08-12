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

interface ClubDefinition {
  teamId: string
  code: string
  displayName: string
  primaryColor: string
  secondaryColor: string
}

interface ClubManifest {
  clubs: ClubDefinition[]
}

const ROOT = process.cwd()
const DATA_ROOT = path.join(ROOT, 'src', 'data', 'ucl-26-27')
const PUBLIC_ROOT = path.join(ROOT, 'public')
const SOURCE_ROOT = path.join(ROOT, 'tmp', 'ucl-26-27-card-sources')
const PORTRAIT_CACHE = path.join(ROOT, 'tmp', 'ucl-26-27-portrait-cache')
const RENDER_CACHE = path.join(ROOT, 'tmp', 'ucl-26-27-render-cache')
const TEMPLATE_WEBP = path.join(PUBLIC_ROOT, 'examples', 'ucl', 'ucl-26-27-clean-no-crest-source.webp')
const TEMPLATE_PNG = path.join(RENDER_CACHE, 'ucl-26-27-clean-no-crest-source.png')
const TEMPLATE = fs.existsSync(TEMPLATE_PNG) ? TEMPLATE_PNG : TEMPLATE_WEBP

const xml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const mimeFor = (filePath: string): string => {
  const extension = path.extname(filePath).toLocaleLowerCase('en-US')
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.png') return 'image/png'
  if (extension === '.webp') return 'image/webp'
  return 'image/jpeg'
}

const dataUriCache = new Map<string, string>()
const imageDataUri = (filePath: string): string => {
  const cached = dataUriCache.get(filePath)
  if (cached) return cached
  const uri = `data:${mimeFor(filePath)};base64,${fs.readFileSync(filePath).toString('base64')}`
  dataUriCache.set(filePath, uri)
  return uri
}

const mediaByKey = (): Map<string, string> => {
  const result = new Map<string, string>()
  if (!fs.existsSync(PORTRAIT_CACHE)) return result
  for (const filename of fs.readdirSync(PORTRAIT_CACHE)) {
    const filePath = path.join(PORTRAIT_CACHE, filename)
    if (!fs.statSync(filePath).isFile() || filename === 'sources.json') continue
    result.set(path.basename(filename, path.extname(filename)), filePath)
  }
  return result
}

const wcPortraits = (): Map<string, string> => {
  const result = new Map<string, string>()
  const cardsRoot = path.join(PUBLIC_ROOT, 'wc-26', 'cards')
  if (!fs.existsSync(cardsRoot)) return result
  for (const country of fs.readdirSync(cardsRoot, { withFileTypes: true })) {
    if (!country.isDirectory()) continue
    const countryRoot = path.join(cardsRoot, country.name)
    for (const filename of fs.readdirSync(countryRoot)) {
      if (!filename.endsWith('.webp')) continue
      const slug = filename.replace(/^\w+-\d+-/, '').replace(/\.webp$/, '')
      result.set(slug, path.join(countryRoot, filename))
    }
  }
  if (fs.existsSync(RENDER_CACHE)) {
    for (const filename of fs.readdirSync(RENDER_CACHE)) {
      if (!filename.endsWith('.png') || filename === path.basename(TEMPLATE_PNG)) continue
      const slug = filename.replace(/^\w+-\d+-/, '').replace(/\.png$/, '')
      result.set(slug, path.join(RENDER_CACHE, filename))
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

const contrastingText = (color: string): string => {
  const value = color.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return red * 0.299 + green * 0.587 + blue * 0.114 > 165 ? '#071020' : '#ffffff'
}

const logoLayer = (logo: string | undefined, club: ClubDefinition, large = false): string => {
  const x = large ? 182 : 92
  const y = large ? 345 : 57
  const width = large ? 660 : 174
  const height = large ? 690 : 190
  if (logo) {
    return `<image href="${imageDataUri(logo)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`
  }
  const fontSize = large ? 176 : 54
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${large ? 76 : 22}" fill="url(#clubGradient)" stroke="#f2f3f5" stroke-width="${large ? 9 : 4}"/>
    <text x="${x + width / 2}" y="${y + height / 2 + fontSize * 0.32}" text-anchor="middle" fill="${contrastingText(club.primaryColor)}" font-family="Arial Narrow, Arial, sans-serif" font-size="${fontSize}" font-weight="900">${xml(club.code)}</text>
  </g>`
}

const portraitLayer = (
  card: CatalogCard,
  portrait: string | undefined,
  club: ClubDefinition,
): string => {
  if (portrait) {
    return `<image href="${imageDataUri(portrait)}" x="76" y="286" width="872" height="920" preserveAspectRatio="xMidYMid slice" clip-path="url(#portraitClip)"/>`
  }
  return `<g clip-path="url(#portraitClip)">
    <rect x="76" y="286" width="872" height="920" fill="url(#missingBg)"/>
    <circle cx="512" cy="625" r="160" fill="${club.secondaryColor}" stroke="${club.primaryColor}" stroke-width="12"/>
    <path d="M218 1210 C250 888 360 804 512 804 C664 804 774 888 806 1210 Z" fill="${club.secondaryColor}" stroke="${club.primaryColor}" stroke-width="12"/>
    <text x="512" y="670" text-anchor="middle" fill="${contrastingText(club.secondaryColor)}" font-family="Arial Narrow, Arial, sans-serif" font-size="118" font-weight="900">${xml(initials(card.displayName))}</text>
  </g>`
}

const nameSize = (name: string): number => {
  const length = Array.from(name).length
  if (length > 25) return 48
  if (length > 21) return 54
  if (length > 17) return 60
  if (length > 13) return 68
  return 76
}

const buildSvg = (
  card: CatalogCard,
  club: ClubDefinition,
  portrait: string | undefined,
  logo: string | undefined,
): string => {
  const displayName = card.displayName.toLocaleUpperCase('en-US')
  const clubName = club.displayName.toLocaleUpperCase('en-US')
  const subject = card.kind === 'team'
    ? `<g clip-path="url(#portraitClip)">
        <rect x="76" y="286" width="872" height="920" fill="url(#teamGlow)" opacity=".82"/>
        <ellipse cx="512" cy="735" rx="350" ry="360" fill="#020716" opacity=".34"/>
        ${logoLayer(logo, club, true)}
      </g>`
    : portraitLayer(card, portrait, club)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
  <defs>
    <clipPath id="portraitClip"><path d="M76 286 H948 V1040 L820 1206 H204 L76 1040 Z"/></clipPath>
    <linearGradient id="missingBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071326"/><stop offset=".52" stop-color="${club.secondaryColor}" stop-opacity=".78"/><stop offset="1" stop-color="#020712"/></linearGradient>
    <radialGradient id="teamGlow"><stop stop-color="${club.primaryColor}" stop-opacity=".72"/><stop offset=".5" stop-color="${club.secondaryColor}" stop-opacity=".58"/><stop offset="1" stop-color="#020712" stop-opacity=".18"/></radialGradient>
    <linearGradient id="clubGradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${club.primaryColor}"/><stop offset="1" stop-color="${club.secondaryColor}"/></linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".5" stop-color="#bfc3ca"/><stop offset="1" stop-color="#f8f8f8"/></linearGradient>
  </defs>
  <image href="${imageDataUri(TEMPLATE)}" width="1024" height="1536"/>
  ${subject}
  <path d="M76 286 H948 V1040 L820 1206 H204 L76 1040 Z" fill="none" stroke="#e7e8ea" stroke-width="4" opacity=".88"/>
  <path d="M48 30 H976 V244 L918 292 H786 L754 260 H292 L260 292 H106 L48 234 Z" fill="#02091a" stroke="#f1f2f4" stroke-width="4"/>
  <path d="M58 40 H966 V226 L910 282 H794 L760 250 H284 L250 282 H114 L58 226 Z" fill="none" stroke="#8d939e" stroke-width="2"/>
  ${logoLayer(logo, club)}
  <text x="514" y="202" text-anchor="middle" fill="url(#silver)" font-family="Arial Narrow, Arial, sans-serif" font-size="112" font-weight="900" letter-spacing="5">UCL</text>
  <text x="856" y="174" text-anchor="middle" fill="url(#silver)" font-family="Arial Narrow, Arial, sans-serif" font-size="106" font-weight="900">${xml(card.cardNumber)}</text>
  <text x="856" y="228" text-anchor="middle" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="4">${xml(club.code)}</text>
  <path d="M82 1178 H942 L972 1210 V1368 L938 1402 H86 L52 1368 V1212 Z" fill="#02091a" stroke="#f0f1f3" stroke-width="5"/>
  <path d="M92 1190 H932 L960 1218 V1358 L930 1388 H94 L64 1358 V1220 Z" fill="none" stroke="#7f8794" stroke-width="2"/>
  <text x="512" y="1328" text-anchor="middle" fill="url(#silver)" stroke="#111827" stroke-width="1" paint-order="stroke" font-family="Arial Narrow, Arial, sans-serif" font-size="${nameSize(displayName)}" font-weight="900" letter-spacing="1">${xml(displayName)}</text>
  <path d="M174 1396 H850 L884 1428 L850 1480 H174 L140 1428 Z" fill="url(#silver)" stroke="#111827" stroke-width="4"/>
  <text x="512" y="1450" text-anchor="middle" fill="#071020" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="1.6">${xml(roleLabel(card, clubName))}</text>
  </svg>`
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(DATA_ROOT, 'manifest.json'), 'utf8'),
) as ClubManifest
const downloadedMedia = mediaByKey()
const localPortraits = wcPortraits()
fs.mkdirSync(SOURCE_ROOT, { recursive: true })

let total = 0
let onlinePortraits = 0
let reusedPortraits = 0
let illustratedPortraits = 0
let realLogos = 0

for (const club of manifest.clubs) {
  if (club.teamId === 'real-madrid') continue
  const catalogPath = path.join(DATA_ROOT, club.teamId, 'cards.json')
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as CatalogFile
  const teamSourceRoot = path.join(SOURCE_ROOT, club.teamId)
  fs.mkdirSync(teamSourceRoot, { recursive: true })
  const logo = downloadedMedia.get(`${club.teamId}-team-logo`)
  if (logo) realLogos += 1

  for (const card of catalog.cards) {
    const onlinePortrait = card.personId ? downloadedMedia.get(card.personId) : undefined
    const localPortrait = card.personId ? localPortraits.get(card.personId) : undefined
    const portrait = onlinePortrait ?? localPortrait
    if (onlinePortrait) onlinePortraits += 1
    else if (localPortrait) reusedPortraits += 1
    else if (card.kind !== 'team') illustratedPortraits += 1
    const outputName = `${path.basename(card.image, '.webp')}.svg`
    fs.writeFileSync(path.join(teamSourceRoot, outputName), buildSvg(card, club, portrait, logo), 'utf8')
    total += 1
  }
}

console.log(
  `Generated ${total} SVG sources: ${onlinePortraits} online portraits, ${reusedPortraits} WC portraits, ${illustratedPortraits} illustrated identities, ${realLogos} club logos.`,
)
