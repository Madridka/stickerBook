import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const offline = process.argv.includes('--offline')
const clubsPath = path.join(projectRoot, 'src/data/russiaClubsLogo/russia/clubs.json')
const clubs = JSON.parse(await readFile(clubsPath, 'utf8'))

const manual = {
  'rus1-01': { foundedYear: 2018, stadium: 'Солидарность Самара Арена' },
  'rus1-02': { foundedYear: 1958, stadium: 'Ахмат Арена' },
  'rus1-03': { foundedYear: 1954, stadium: 'Ростех Арена' },
  'rus1-04': { foundedYear: 1927, stadium: 'Анжи Арена' },
  'rus1-05': { foundedYear: 1923 },
  'rus1-07': { stadium: 'Озон Арена' },
  'rus1-11': { foundedYear: 2015, stadium: 'Арена Химки' },
  'rus2-03': { foundedYear: 1947 },
  'rus2-04': { foundedYear: 1937 },
  'rus2-06': { foundedYear: 2018 },
  'rus2-10': { foundedYear: 1946 },
  'rus2-12': { foundedYear: 1959 },
  'rus2-17': { foundedYear: 1977 },
  'rus2-18': { foundedYear: 1957 },
  'rus3-gold-01': { stadium: 'Республиканский стадион «Спартак»' },
  'rus3-gold-03': { foundedYear: 1923 },
  'rus3-gold-05': { foundedYear: 2021 },
  'rus3-gold-07': { foundedYear: 1936 },
  'rus3-gold-08': { foundedYear: 2022 },
  'rus3-gold-09': { foundedYear: 2019 },
  'rus3-gold-10': { foundedYear: 1930 },
  'rus3-silver-02': { foundedYear: 1986 },
  'rus3-silver-03': { foundedYear: 1924 },
  'rus3-silver-04': { foundedYear: 1993 },
  'rus3-silver-05': { foundedYear: 1946 },
  'rus3-silver-06': { foundedYear: 1942 },
  'rus4-g1-01': { foundedYear: 1993 },
  'rus4-g1-02': { foundedYear: 1931 },
  'rus4-g1-03': { foundedYear: 2022 },
  'rus4-g1-04': { foundedYear: 1963 },
  'rus4-g1-05': { foundedYear: 2023, stadium: 'Спортивный ангар' },
  'rus4-g1-06': { foundedYear: 2016, stadium: 'Дружба' },
  'rus4-g1-07': { foundedYear: 1982 },
  'rus4-g1-08': { foundedYear: 2025, stadium: 'Труд' },
  'rus4-g1-09': { foundedYear: 2022 },
  'rus4-g1-10': { foundedYear: 2024 },
  'rus4-g1-11': { foundedYear: 2009 },
  'rus4-g1-12': { foundedYear: 2014 },
  'rus4-g1-13': { foundedYear: 1935 },
  'rus4-g1-14': { foundedYear: 2026, stadium: 'Имени И. П. Чайки' },
  'rus4-g1-15': { foundedYear: 2025, stadium: 'Форте Арена' },
  'rus4-g2-01': { foundedYear: 2021 },
  'rus4-g2-02': { foundedYear: 1922 },
  'rus4-g2-03': { foundedYear: 1926 },
  'rus4-g2-04': { foundedYear: 2011 },
  'rus4-g2-05': { foundedYear: 2008 },
  'rus4-g2-06': { foundedYear: 2020 },
  'rus4-g2-07': { foundedYear: 2026, stadium: 'Стадион СГАФКСТ' },
  'rus4-g2-08': { foundedYear: 2022 },
  'rus4-g2-10': { foundedYear: 2014 },
  'rus4-g2-11': { foundedYear: 1964 },
  'rus4-g2-12': { foundedYear: 2020 },
  'rus4-g2-13': { foundedYear: 1959 },
  'rus4-g2-14': { foundedYear: 2011 },
  'rus4-g3-01': { foundedYear: 1958 },
  'rus4-g3-02': { foundedYear: 2012 },
  'rus4-g3-03': { foundedYear: 2016 },
  'rus4-g3-04': { foundedYear: 1918 },
  'rus4-g3-05': { foundedYear: 1962 },
  'rus4-g3-07': { foundedYear: 1960 },
  'rus4-g3-08': { foundedYear: 2023, stadium: 'Спартаковец' },
  'rus4-g3-09': { foundedYear: 2016 },
  'rus4-g3-10': { foundedYear: 2010 },
  'rus4-g3-11': { foundedYear: 1960 },
  'rus4-g3-12': { foundedYear: 1946 },
  'rus4-g3-13': { foundedYear: 2021 },
  'rus4-g3-14': { foundedYear: 2022 },
  'rus4-g3-15': { foundedYear: 2010 },
  'rus4-g3-16': { foundedYear: 2024 },
  'rus4-g4-01': { foundedYear: 2022 },
  'rus4-g4-02': { foundedYear: 1957 },
  'rus4-g4-03': { foundedYear: 2011 },
  'rus4-g4-04': { foundedYear: 2025 },
  'rus4-g4-05': { foundedYear: 2017 },
  'rus4-g4-06': { foundedYear: 1991 },
  'rus4-g4-07': { foundedYear: 2017 },
  'rus4-g4-08': { foundedYear: 2026, stadium: 'Северный' },
  'rus4-g4-09': { foundedYear: 1997 },
  'rus4-g4-10': { foundedYear: 2015 },
  'rus4-g4-11': { foundedYear: 1946 },
  'rus4-g4-12': { foundedYear: 2025 },
}

const decodeHtml = (value) => value
  .replaceAll('&quot;', '"')
  .replaceAll('&#x27;', "'")
  .replaceAll('&amp;', '&')
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&laquo;', '«')
  .replaceAll('&raquo;', '»')

const toPlainText = (html) => decodeHtml(
  html
    .replace(/<!--\/?\$-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' '),
).trim()

const extractFoundedYear = (html) => {
  const historyStart = html.indexOf('История команды')
  if (historyStart < 0) return null
  const historyEnd = html.indexOf('<h2', historyStart + 30)
  const historyHtml = html.slice(historyStart, historyEnd > historyStart ? historyEnd : historyStart + 12_000)
  const history = toPlainText(historyHtml)
  const patterns = [
    /(?:основан|основана|основано|основаны|образован|образована|создан|создана|создано)[^.!?]{0,120}?(18\d{2}|19\d{2}|20\d{2})\s*(?:году|г\.)?/i,
    /(?:год(?:ом)? основания|дата основания|история клуба)[^.!?]{0,120}?(18\d{2}|19\d{2}|20\d{2})/i,
    /(?:вед[её]т отсч[её]т|началась|начинается|появился|появилась)[^.!?]{0,120}?(18\d{2}|19\d{2}|20\d{2})/i,
  ]
  for (const pattern of patterns) {
    const match = history.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

const loadMetadata = async (club) => {
  const response = await fetch(club.sourcePage, {
    headers: { 'user-agent': 'Mozilla/5.0 stickerBook club card collector' },
  })
  if (!response.ok) throw new Error(`${club.id}: HTTP ${response.status}`)
  const html = await response.text()
  const appDataMatch = html.match(/<script type="mime\/invalid" id="app-data">(?<json>.*?)<\/script>/s)
  const appData = appDataMatch?.groups?.json ? JSON.parse(appDataMatch.groups.json) : null
  const stadium = appData?.model?.header?.stadium?.trim().normalize('NFC') || null
  return {
    ...club,
    stadium: manual[club.id]?.stadium ?? stadium,
    foundedYear: manual[club.id]?.foundedYear ?? extractFoundedYear(html),
  }
}

const results = offline
  ? clubs.map((club) => ({
      ...club,
      stadium: manual[club.id]?.stadium ?? club.stadium,
      foundedYear: manual[club.id]?.foundedYear ?? club.foundedYear,
    }))
  : new Array(clubs.length)

if (!offline) {
  let cursor = 0
  const workers = Array.from({ length: 8 }, async () => {
    while (cursor < clubs.length) {
      const index = cursor
      cursor += 1
      results[index] = await loadMetadata(clubs[index])
    }
  })
  await Promise.all(workers)
}

const normalize = (value) => value.toLocaleLowerCase('ru-RU').replace(/[«»"'().\s-]+/g, '')
const loadWikidataYear = async (club) => {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: `${club.displayName} ${club.city}`,
    language: 'ru',
    uselang: 'ru',
    type: 'item',
    limit: '8',
    format: 'json',
    origin: '*',
  })
  const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`)
  if (!response.ok) return null
  const payload = await response.json()
  const candidates = (payload.search ?? [])
    .map((candidate) => {
      const label = candidate.label ?? ''
      const description = (candidate.description ?? '').toLocaleLowerCase('ru-RU')
      let score = 0
      if (description.includes('футбольн')) score += 20
      if (description.includes('российск')) score += 10
      if (description.includes(club.city.toLocaleLowerCase('ru-RU'))) score += 8
      if (normalize(label) === normalize(club.displayName)) score += 12
      if (/женск|пляжн|мини-футбол|хоккей/.test(description)) score -= 40
      return { ...candidate, score }
    })
    .filter(({ score }) => score >= 20)
    .sort((left, right) => right.score - left.score)
  for (const candidate of candidates.slice(0, 3)) {
    const entityResponse = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${candidate.id}.json`)
    if (!entityResponse.ok) continue
    const entityPayload = await entityResponse.json()
    const time = entityPayload.entities?.[candidate.id]?.claims?.P571?.[0]?.mainsnak?.datavalue?.value?.time
    const match = typeof time === 'string' ? time.match(/[+-](\d{4,})-/) : null
    if (match) return Number(match[1])
  }
  return null
}

const missingYearClubs = results.filter(({ foundedYear }) => !foundedYear)
let wikidataCursor = 0
const wikidataWorkers = Array.from({ length: 8 }, async () => {
  while (wikidataCursor < missingYearClubs.length) {
    const index = wikidataCursor
    wikidataCursor += 1
    const club = missingYearClubs[index]
    club.foundedYear = await loadWikidataYear(club)
  }
})
await Promise.all(wikidataWorkers)

await writeFile(clubsPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
const missingStadiums = results.filter(({ stadium }) => !stadium)
const missingYears = results.filter(({ foundedYear }) => !foundedYear)
console.log(JSON.stringify({
  clubs: results.length,
  missingStadiums: missingStadiums.map(({ id, displayName }) => ({ id, displayName })),
  missingYears: missingYears.map(({ id, displayName }) => ({ id, displayName })),
}, null, 2))
