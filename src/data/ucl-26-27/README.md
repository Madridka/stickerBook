# UCL 2026/27 journal

This directory powers the registered `ucl-26-27` journal at `/album/ucl-26-27`. The album contains three editorial pages and one two-page, 20-card spread for each of the six clubs. Final card assets live in `public/ucl-26-27/cards`; album page art lives in `assets/game/ucl-26-27/main/album`.

## Snapshot

- Snapshot date: `2026-08-02`.
- Status: `draft`; all six club lists are pre-season snapshots and must be checked again before image generation and after the transfer window closes.
- Confirmed league-phase clubs in this first batch: Real Madrid CF, FC Barcelona, FC Bayern München, Borussia Dortmund, Paris Saint-Germain and Arsenal FC.
- Participation source: UEFA's official [2026/27 competition overview and access list](https://www.uefa.com/uefachampionsleague/news/02a6-20d57cfcd03e-407c22a7f465-1000--2026-27-champions-league-teams-dates-draws-format-final/).
- Squad sources: official first-team pages for [Real Madrid](https://www.realmadrid.com/en-US/football/first-team/players), [Barcelona](https://www.fcbarcelona.com/en/football/first-team/squad), [Bayern](https://fcbayern.com/en/teams/first-team), [Dortmund](https://www.bvb.de/de/en.html), [Paris](https://www.psg.fr/football-masculin/effectif) and [Arsenal](https://www.arsenal.com/men/players), plus official club transfer and pre-season announcements where the overview was provisional or not fully updated.

## Catalog contract

Each club owns one editable `cards.json` with 20 schema-v2 base cards: one team, one head coach, two goalkeepers, six defenders, five midfielders and five forwards. Card IDs use `ucl-26-27-{lowercase-code}-{01..20}`; human `personId` values are stable ASCII kebab-case. Asset paths use `/ucl-26-27/cards/{teamId}/UCL-{CODE}-{NUMBER}-{personId}.webp` (or `team-logo` for slot 01).

The rarity distribution per club is seven common, six uncommon (including the team card), four rare (including the coach), two epic and one legendary. All cards belong to the `base` series, use the `standard` finish and point at the `ucl-26-27-standard` pool; a shop blister is intentionally not registered yet.

## Visual assets

The card layout is derived from `public/examples/ucl/ucl-26-27-clean-no-crest-source.webp`; Jude Bellingham keeps the supplied completed example. Where a matching portrait card already exists in the local WC-26 collection it is reused inside the UCL frame. Cards without a local portrait use a deliberate club-colour illustrated identity with initials, rather than an incorrect player likeness. `scripts/generate-ucl-26-27-card-sources.ts` recreates the intermediate SVG sources used by the Sharp rendering step.

## Provisional decisions

- Official Real Madrid, Paris and Bayern pages explicitly describe their 2026/27 lists as provisional or subject to pre-season updates. Only people present on the latest official first-team pages were selected.
- Dortmund's later official announcement confirms Karim Adeyemi's immediate transfer to Barcelona, so he is excluded from BVB. Samuele Inacio and Mathis Albert fill the final forward slots; both have current official BVB player profiles and first-team appearances, and Inacio signed through 2029.
- Arsenal's roster endpoint was intermittently inaccessible to automated retrieval. The selection was reconciled with the official player pages and the latest official 2026 pre-season line-ups; only confirmed first-team players were retained.
- Barcelona's provisional first-team page includes Anthony Gordon and Karim Adeyemi. They are included because the club page itself lists both as forwards at the snapshot date; this is especially time-sensitive and needs revalidation.
- Shirt numbers are omitted because 2026/27 numbers are provisional for several clubs.

No official tournament logo or downloaded tournament branding is stored here. Adding another club later requires a new directory with `cards.json`, a matching manifest entry and a new two-page geometry section; the catalog loader derives its expected counts from the manifest.
