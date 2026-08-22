const teams = [
  ['rusmfl-01', '2DROTS', 15],
  ['rusmfl-02', 'АМКАЛ', 3],
  ['rusmfl-03', 'ФК 10', 8],
  ['rusmfl-04', 'ФК Апсны', 61],
  ['rusmfl-05', 'Broke Boys', 9],
  ['rusmfl-06', 'Lit Energy', 53],
  ['rusmfl-07', 'Prime Squad', 63],
  ['rusmfl-08', 'Народная Команда', 28],
  ['rusmfl-09', 'СиндЕкат', 54],
  ['rusmfl-10', 'СКА Ростов', 51],
  ['rusmfl-11', 'ФК Vibe', 60],
  ['rusmfl-12', 'ФК Матч', 11],
  ['rusmfl-13', 'ФК Юнисон', 62],
  ['rusmfl-14', 'Эгриси', 16],
  ['rusmfl-15', 'Fight Nights', 17],
  ['rusmfl-16', 'Банка', 52],
];

const origin = 'https://mfl.life';

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'StickerBook/1.0 (stadium metadata research)' },
  });
  if (response.ok) return response.text();
  if (attempt < 4 && [429, 500, 502, 503, 504].includes(response.status)) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    return fetchText(url, attempt + 1);
  }
  throw new Error(`${response.status} ${response.statusText}: ${url}`);
}

async function mapLimited(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) =>
      String.fromCodePoint(Number.parseInt(hex ?? decimal, hex ? 16 : 10)),
    );
}

const matchIdsByTeam = new Map();
await mapLimited(teams, 4, async ([catalogId, , teamId]) => {
  const pages = await Promise.all(
    [1, 2].map((page) => fetchText(`${origin}/teams/${teamId}/matches/?p=${page}`)),
  );
  const ids = pages.flatMap((html) =>
    [...html.matchAll(/href="\/matches\/(\d+)\/"/g)].map((match) => match[1]),
  );
  matchIdsByTeam.set(catalogId, [...new Set(ids)].slice(0, 20));
});

const allMatchIds = [...new Set([...matchIdsByTeam.values()].flat())];
const stadiumByMatch = new Map();
await mapLimited(allMatchIds, 6, async (matchId) => {
  const html = await fetchText(`${origin}/matches/${matchId}/`);
  const match = html.match(/<span>\s*(Стадион[^<]+)\s*<\/span>/i);
  if (match) stadiumByMatch.set(matchId, decodeHtml(match[1]).trim());
});

const report = teams.map(([catalogId, team, teamId]) => {
  const counts = new Map();
  for (const matchId of matchIdsByTeam.get(catalogId) ?? []) {
    const stadium = stadiumByMatch.get(matchId);
    if (stadium) counts.set(stadium, (counts.get(stadium) ?? 0) + 1);
  }
  const stadiums = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  return {
    catalogId,
    team,
    officialTeamId: teamId,
    matchesChecked: (matchIdsByTeam.get(catalogId) ?? []).length,
    matchesWithStadium: stadiums.reduce((sum, [, count]) => sum + count, 0),
    primaryStadium: stadiums[0]?.[0] ?? null,
    stadiums: Object.fromEntries(stadiums),
  };
});

console.log(JSON.stringify(report, null, 2));
