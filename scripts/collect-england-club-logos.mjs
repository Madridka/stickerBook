import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const structurePath = path.join(projectRoot, 'src/data/englandClubsLogo/england/structure.json')
const manifestPath = path.join(projectRoot, 'src/data/englandClubsLogo/england/logo-sources.json')
const sourceRoot = path.join(projectRoot, 'tmp/englandClubsLogo-logo-sources')
const shouldDownload = process.argv.includes('--download')
const shouldStartFresh = process.argv.includes('--fresh')
const roundArgument = process.argv.find((argument) => argument.startsWith('--round='))?.split('=')[1] ?? 'all'

const structure = JSON.parse(await fs.readFile(structurePath, 'utf8'))
const clubs = structure.divisions.flatMap((division) => division.clubs.map((club) => ({
  ...club,
  level: division.level,
  section: division.section,
})))

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// The album never renders a crest above roughly 450 px. Requesting Wikimedia's
// 1280 px thumbnail only bloats the repository and triggers much stricter
// throttling, so downloads use a clean 512 px derivative where one is exposed.
const getDownloadUrls = (sourceUrl) => {
  const cleanUrl = sourceUrl.replace(/\?.*$/, '')
  const parsedUrl = new URL(cleanUrl)
  const thumbMarker = parsedUrl.pathname.indexOf('/thumb/')
  let originalUrl = cleanUrl
  if (thumbMarker >= 0) {
    const pathAfterThumb = parsedUrl.pathname.slice(thumbMarker + '/thumb/'.length)
    const pathParts = pathAfterThumb.split('/')
    pathParts.pop()
    parsedUrl.pathname = `${parsedUrl.pathname.slice(0, thumbMarker)}/${pathParts.join('/')}`
    originalUrl = parsedUrl.toString()
  }
  const proxyUrl = new URL('https://wsrv.nl/')
  proxyUrl.search = new URLSearchParams({
    url: originalUrl.replace(/^https?:\/\//, ''),
    w: '512',
    output: 'png',
  })
  const originalAssetUrl = new URL(originalUrl)
  const photonUrls = ['i0.wp.com', 'i1.wp.com', 'i2.wp.com'].map((host) => {
    const photonUrl = new URL(`https://${host}/${originalAssetUrl.host}${originalAssetUrl.pathname}`)
    photonUrl.searchParams.set('w', '512')
    return photonUrl.toString()
  })
  const thumbAssetUrl = new URL(cleanUrl)
  const photonThumbUrls = ['i0.wp.com', 'i1.wp.com', 'i2.wp.com'].map((host) => {
    const photonUrl = new URL(`https://${host}/${thumbAssetUrl.host}${thumbAssetUrl.pathname}`)
    photonUrl.searchParams.set('w', '512')
    return photonUrl.toString()
  })
  return [...new Set([
    ...photonUrls,
    ...photonThumbUrls,
    proxyUrl.toString(),
    originalUrl,
    cleanUrl.replace('/1280px-', '/512px-'),
    cleanUrl.replace('/1280px-', '/320px-'),
    cleanUrl,
  ])]
}

const fetchJson = async (url, attempts = 6) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response
    try {
      response = await fetch(url, {
        headers: { 'user-agent': 'StickerBook/1.10 (club logo album research)' },
      })
    } catch (error) {
      if (attempt === attempts) throw error
      await delay(attempt * 1_000)
      continue
    }
    if (response.ok) return response.json()
    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 3)
      await delay(Math.min(15_000, Math.max(3_000, retryAfterSeconds * 1_000)))
      continue
    }
    if (attempt === attempts) throw new Error(`${response.status} ${url}`)
    await delay(attempt * 500)
  }
}

const chunks = (values, size) => Array.from(
  { length: Math.ceil(values.length / size) },
  (_value, index) => values.slice(index * size, (index + 1) * size),
)

const fetchBinary = async (url, attempts = 1) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'StickerBook/1.10 (club logo album research)' },
        signal: AbortSignal.timeout(15_000),
      })
      if (response.ok) return response
      if (response.status !== 429 || attempt === attempts) throw new Error(`${response.status} ${url}`)
    } catch (error) {
      if (attempt === attempts) throw error
    }
    await delay(attempt * 5_000)
  }
}

const queryTitleBatch = async (entries) => {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.search = new URLSearchParams({
    action: 'query',
    titles: entries.map(({ title }) => title).join('|'),
    redirects: '1',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const result = await fetchJson(url)
  const aliases = new Map(entries.map(({ title }) => [title, title]))
  for (const normalized of result.query?.normalized ?? []) aliases.set(normalized.from, normalized.to)
  for (const redirect of result.query?.redirects ?? []) aliases.set(redirect.from, redirect.to)

  const followAlias = (title) => {
    let current = title
    const visited = new Set()
    while (aliases.has(current) && aliases.get(current) !== current && !visited.has(current)) {
      visited.add(current)
      current = aliases.get(current)
    }
    return current
  }
  const pages = new Map((result.query?.pages ?? []).map((page) => [page.title, page]))

  return entries.map((entry) => ({ entry, page: pages.get(followAlias(entry.title)) }))
}

const queryImageBatch = async (imageTitles) => {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.search = new URLSearchParams({
    action: 'query',
    titles: imageTitles.map((title) => `File:${title}`).join('|'),
    redirects: '1',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1200',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const result = await fetchJson(url)
  return new Map((result.query?.pages ?? [])
    .filter((page) => page.imageinfo?.[0]?.url)
    .map((page) => [page.title.replace(/^File:/, '').toLowerCase(), page.imageinfo[0].thumburl ?? page.imageinfo[0].url]))
}

const getInfoboxImageTitle = (page) => {
  const content = page?.revisions?.[0]?.slots?.main?.content ?? ''
  const match = content.match(/^\|\s*(?:image|logo)\s*=\s*(?:\[\[\s*(?:File:|Image:))?([^\n|\]}]+)/im)
  return match?.[1]?.trim().replace(/\s+\d+px$/i, '') ?? ''
}

const candidateFactoriesByRound = {
  primary: (club) => club.articleTitle || `${club.displayName} F.C.`,
  afc: (club) => `${club.displayName} A.F.C.`,
  plain: (club) => club.displayName,
}
const candidateFactories = roundArgument === 'all'
  ? Object.values(candidateFactoriesByRound)
  : [candidateFactoriesByRound[roundArgument]].filter(Boolean)
const resolved = new Map()
const createManifest = () => clubs.map((club) => ({
  id: club.id,
  displayName: club.displayName,
  level: club.level,
  section: club.section,
  status: resolved.has(club.id) ? 'resolved' : 'unresolved',
  ...(resolved.get(club.id) ?? {}),
}))

try {
  if (shouldStartFresh) throw Object.assign(new Error('Fresh run'), { code: 'ENOENT' })
  const existingManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  for (const entry of existingManifest) {
    if (entry.status === 'resolved') {
      resolved.set(entry.id, {
        articleTitle: entry.articleTitle,
        imageTitle: entry.imageTitle,
        sourceUrl: entry.sourceUrl,
      })
    }
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

for (const candidateFactory of candidateFactories) {
  const pending = clubs.filter((club) => !resolved.has(club.id))
  const entries = pending.map((club) => ({ club, title: candidateFactory(club) }))
  let completedBatches = 0
  for (const batch of chunks(entries, 50)) {
    const results = await queryTitleBatch(batch)
    const pageImages = results
      .map(({ page }) => getInfoboxImageTitle(page))
      .filter(Boolean)
    await delay(700)
    const imageUrls = await queryImageBatch(pageImages)
    for (const { entry, page } of results) {
      const imageTitle = getInfoboxImageTitle(page)
      const sourceUrl = imageUrls.get(imageTitle.toLowerCase())
      if (!page?.missing && sourceUrl) {
        resolved.set(entry.club.id, {
          articleTitle: page.title,
          imageTitle,
          sourceUrl,
        })
      }
    }
    completedBatches += 1
    console.log(`round=${roundArgument} batch=${completedBatches}/${Math.ceil(entries.length / 50)} resolved=${resolved.size}`)
    await fs.writeFile(manifestPath, `${JSON.stringify(createManifest(), null, 2)}\n`, 'utf8')
    await delay(2_200)
  }
}

const manifest = createManifest()

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

if (shouldDownload) {
  await fs.mkdir(sourceRoot, { recursive: true })
  const existingIds = new Set((await fs.readdir(sourceRoot)).map((fileName) => fileName.split('.')[0]))
  const resolvedEntries = manifest.filter(({ status, id }) => status === 'resolved' && !existingIds.has(id))
  let downloadCursor = 0
  const downloadEntry = async (entry) => {
      let response
      let lastError
      for (const downloadUrl of getDownloadUrls(entry.sourceUrl)) {
        try {
          response = await fetchBinary(downloadUrl)
          break
        } catch (error) {
          lastError = error
        }
      }
      if (!response) {
        console.warn(`download-skipped id=${entry.id} error=${lastError?.message ?? 'unknown'}`)
        return
      }
      const contentType = response.headers.get('content-type') ?? ''
      const extension = contentType.includes('svg') ? 'svg'
        : contentType.includes('webp') ? 'webp'
          : contentType.includes('jpeg') ? 'jpg'
          : 'png'
      await fs.writeFile(path.join(sourceRoot, `${entry.id}.${extension}`), Buffer.from(await response.arrayBuffer()))
  }
  const workers = Array.from({ length: 24 }, async () => {
    while (downloadCursor < resolvedEntries.length) {
      const entry = resolvedEntries[downloadCursor]
      downloadCursor += 1
      await downloadEntry(entry)
      await delay(100)
    }
  })
  await Promise.all(workers)
}

const resolvedCount = manifest.filter(({ status }) => status === 'resolved').length
console.log(JSON.stringify({ total: manifest.length, resolved: resolvedCount, unresolved: manifest.length - resolvedCount }))
