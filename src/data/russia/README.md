# RPL 2026/27 journal

The registered `rpl-26-27` journal uses the 16 editable catalogs in `rpl-26-27/*/cards.json`.
Each club owns 20 base cards: one team card, one coach, two goalkeepers, six defenders,
five midfielders and five forwards.

The catalogs reference exactly 320 card paths: 20 cards for each of the 16 clubs. Every
temporary WebP is an exact byte-for-byte copy of `tmp/rpl-26-27/card-placeholder.webp`;
final player art can replace these files later without changing the data contract.

Run `npm run validate:rpl` to validate catalogs, path conventions, WebP signatures, the
320 referenced assets and the 320-file identical-placeholder batch.
