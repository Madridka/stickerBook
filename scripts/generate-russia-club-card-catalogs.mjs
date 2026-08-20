import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const dataRoot = path.join(projectRoot, 'src/data/russiaClubsLogo/russia')
const clubs = JSON.parse(await readFile(path.join(dataRoot, 'clubs.json'), 'utf8'))
const previewFileNames = {
  'rus1-01': 'RUS1-01-akron.webp',
  'rus1-02': 'RUS1-02-akhmat.webp',
  'rus1-03': 'RUS1-03-baltika.webp',
  'rus1-04': 'RUS1-04-dynamo-makhachkala.webp',
}

const sections = [
  'rpl',
  'first-league',
  'second-a-gold',
  'second-a-silver',
  'second-b-g1',
  'second-b-g2',
  'second-b-g3',
  'second-b-g4',
]

for (const section of sections) {
  const sectionClubs = clubs.filter((club) => club.section === section)
  const cards = sectionClubs.map((club) => {
    const sourceSlug = club.sourcePage.split('/').filter(Boolean).at(-1)
    const fileName = previewFileNames[club.id]
      ?? `${club.id.toUpperCase()}-${sourceSlug}.webp`
    return {
      id: club.id,
      cardNumber: String(club.albumSlot).padStart(2, '0'),
      albumSlot: club.albumSlot,
      displayName: club.displayName,
      city: club.city,
      country: club.country,
      foundedYear: club.foundedYear,
      stadium: club.stadium,
      leagueId: club.leagueId,
      countryCode: club.countryCode,
      image: `/russiaClubsLogo/cards/russia/${section}/${fileName}`,
      series: 'base',
      finish: 'standard',
      rarity: 'uncommon',
      kind: 'team',
    }
  })
  const sectionRoot = path.join(dataRoot, section)
  await mkdir(sectionRoot, { recursive: true })
  await writeFile(path.join(sectionRoot, 'cards.json'), `${JSON.stringify(cards, null, 2)}\n`, 'utf8')
}

console.log(`Generated card catalogs for ${clubs.length} Russian clubs in ${sections.length} sections`)
