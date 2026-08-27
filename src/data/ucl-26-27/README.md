# UCL 2026/27 journal

This directory powers the registered `ucl-26-27` journal at `/album/ucl-26-27`. The album contains five navigation/editorial pages and one two-page, 20-card spread for each of 36 clubs. Final card assets live in `public/ucl-26-27/cards`; album page art lives in `assets/game/ucl-26-27/main/album`.

## Snapshot

- Snapshot date: `2026-08-27`.
- Status: `complete`; all 36 clubs and 720 base cards are represented.
- Final additions: AEK Athens, Bodø/Glimt, Fenerbahçe, LASK, Sabah, Shakhtar Donetsk, Slovan Bratislava and Viking.
- Participation source: UEFA's official [2026/27 competition overview and access list](https://www.uefa.com/uefachampionsleague/news/02a6-20d57cfcd03e-407c22a7f465-1000--2026-27-champions-league-teams-dates-draws-format-final/).
- Squad sources: official first-team pages for [Real Madrid](https://www.realmadrid.com/en-US/football/first-team/players), [Barcelona](https://www.fcbarcelona.com/en/football/first-team/squad), [Bayern](https://fcbayern.com/en/teams/first-team), [Dortmund](https://www.bvb.de/de/en.html), [Paris](https://www.psg.fr/football-masculin/effectif) and [Arsenal](https://www.arsenal.com/men/players), plus official club transfer and pre-season announcements where the overview was provisional or not fully updated.
- The dated source map and selection notes for the final eight clubs are stored in `roster-sources.json`.

## Catalog contract

Each club owns one editable `cards.json` with 20 schema-v2 base cards: one team, one head coach, two goalkeepers, six defenders, five midfielders and five forwards. Card IDs use `ucl-26-27-{lowercase-code}-{01..20}`; human `personId` values are stable ASCII kebab-case. Asset paths use `/ucl-26-27/cards/{teamId}/UCL-{CODE}-{NUMBER}-{personId}.webp` (or `team-logo` for slot 01).

The rarity distribution per club is seven common, six uncommon (including the team card), four rare (including the coach), two epic and one legendary. All cards belong to the `base` series, use the `standard` finish and point at the `ucl-26-27-standard` pool used by the UCL shop blister.

## Visual assets

The card layout is derived from `public/examples/ucl/ucl-26-27-clean-no-crest-source.webp` and the completed Real Madrid set. Real Madrid is kept unchanged as the visual reference. The other 35 clubs use crests and portraits from the attributed online media cache or a matching local WC-26 portrait. Online source URLs and lookup results are recorded in `src/data/ucl-26-27/media-sources.json`; downloaded working images stay under `tmp` and are not shipped with the app. The source generator rejects missing crests or portraits for the final eight additions, so illustrated identities cannot enter those sets.

`scripts/collect-ucl-26-27-media.ts` collects Wikimedia fallbacks, while the two `collect-ucl-26-27-sportsdb-*.ps1` scripts collect club media and remaining people through the rate-limited TheSportsDB API. `scripts/collect-ucl-26-27-image-search.ps1` fills exact-name gaps and records both the source page and original image URL. `scripts/prepare-ucl-26-27-render-cache.ps1` builds the temporary PNG cache, `scripts/generate-ucl-26-27-card-sources.ts` recreates the intermediate SVG sources under `tmp`, and `scripts/render-ucl-26-27-cards.ps1` renders the 700 non-RMA WebP files with Sharp. The PNG cache is needed because the current SVG renderer does not reliably decode nested WebP data URIs.

## Roster decisions

- Official Real Madrid, Paris and Bayern pages explicitly describe their 2026/27 lists as provisional or subject to pre-season updates. Only people present on the latest official first-team pages were selected.
- Dortmund's later official announcement confirms Karim Adeyemi's immediate transfer to Barcelona, so he is excluded from BVB. Samuele Inacio and Mathis Albert fill the final forward slots; both have current official BVB player profiles and first-team appearances, and Inacio signed through 2029.
- Arsenal's roster endpoint was intermittently inaccessible to automated retrieval. The selection was reconciled with the official player pages and the latest official 2026 pre-season line-ups; only confirmed first-team players were retained.
- Barcelona's provisional first-team page includes Anthony Gordon and Karim Adeyemi. They are included because the club page itself lists both as forwards at the snapshot date; this is especially time-sensitive and needs revalidation.
- LASK's Florian Flecker is treated as an attacking player to preserve the journal's five-forward contract.
- Shakhtar's Alisson Santana and Eguinaldo are treated as wide attackers in the five-forward block.
- Slovan's Yaya Touré occupies the single coach slot shown on the official staff page.
- Viking lists a shared head-coach team; Bjarte Lunde Aarsheim occupies the journal's single coach slot.
- Shirt numbers are omitted because 2026/27 numbers are provisional for several clubs.

No official tournament logo or downloaded tournament branding is stored here. Adding another club requires a manifest entry and a `cards.json`; geometry and contents derive their club lists from the manifest.
