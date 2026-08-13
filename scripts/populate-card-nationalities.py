#!/usr/bin/env python3
"""Apply the researched football nationalities to player card catalogs."""

from __future__ import annotations

import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_ROOTS = (
    PROJECT_ROOT / "src" / "data" / "ucl-26-27",
    PROJECT_ROOT / "src" / "data" / "tomsk",
)

# Values follow football nationality (the represented national association),
# not the club's countryCode. Their order matches player cards in each catalog.
NATIONALITIES: dict[str, list[str]] = {
    "arsenal": [
        "Spain", "France", "France", "Brazil", "Netherlands", "Italy",
        "Ecuador", "England", "England", "Spain", "Brazil", "Norway",
        "England", "England", "Sweden", "Germany", "England", "Brazil",
    ],
    "aston-villa": [
        "Argentina", "Netherlands", "England", "Netherlands", "Poland", "Spain",
        "Senegal", "Serbia", "Switzerland", "Belgium", "France", "Brazil",
        "Netherlands", "Argentina", "Côte d'Ivoire", "England", "England", "Argentina",
    ],
    "atletico-madrid": [
        "Slovenia", "Argentina", "Slovakia", "Spain", "Argentina", "Spain",
        "Spain", "Spain", "Spain", "Denmark", "South Korea", "Spain",
        "United States", "Argentina", "Spain", "Nigeria", "Argentina", "Norway",
    ],
    "barcelona": [
        "Spain", "Hungary", "Spain", "France", "Spain", "Spain",
        "Spain", "Spain", "Spain", "Spain", "Spain", "Netherlands",
        "Spain", "Spain", "England", "Brazil", "Spain", "Germany",
    ],
    "bayern-munich": [
        "Germany", "Germany", "France", "Germany", "Canada", "Croatia",
        "Austria", "Germany", "Germany", "Germany", "Germany", "Morocco",
        "Germany", "France", "Colombia", "England", "Germany", "Germany",
    ],
    "borussia-dortmund": [
        "Switzerland", "Germany", "Germany", "Norway", "Sweden", "France",
        "Germany", "Italy", "Germany", "England", "Greece", "Austria",
        "Austria", "Germany", "Guinea", "Portugal", "Italy", "United States",
    ],
    "club-brugge": [
        "Switzerland", "Belgium", "Ecuador", "Belgium", "Belgium", "Belgium",
        "South Korea", "Belgium", "England", "Switzerland", "France", "Norway",
        "Belgium", "Germany", "Portugal", "Spain", "Belgium", "Senegal",
    ],
    "como": [
        "France", "Indonesia", "England", "Spain", "Brazil", "Brazil",
        "Spain", "Austria", "Argentina", "Croatia", "Argentina", "France",
        "France", "Spain", "Senegal", "Greece", "Netherlands", "Germany",
    ],
    "feyenoord": [
        "Germany", "Ireland", "Netherlands", "Australia", "Japan", "Bosnia and Herzegovina",
        "Spain", "Netherlands", "Netherlands", "Morocco", "Netherlands", "Poland",
        "Netherlands", "Algeria", "Japan", "Spain", "Denmark", "Portugal",
    ],
    "galatasaray": [
        "Türkiye", "Türkiye", "Côte d'Ivoire", "Colombia", "Hungary", "Senegal",
        "Türkiye", "Denmark", "Brazil", "France", "Uruguay", "Guinea-Bissau",
        "Gabon", "Nigeria", "Türkiye", "Germany", "Türkiye", "Türkiye",
    ],
    "inter": [
        "Spain", "Italy", "Italy", "Germany", "Italy", "Brazil",
        "Switzerland", "England", "Italy", "Croatia", "Serbia", "Italy",
        "France", "Argentina", "France", "Italy", "France", "Brazil",
    ],
    "lens": [
        "France", "France", "Austria", "France", "Saudi Arabia", "France",
        "Bosnia and Herzegovina", "France", "Montenegro", "Algeria", "Mali", "France",
        "Belgium", "France", "France", "Senegal", "France", "Poland",
    ],
    "lille": [
        "Türkiye", "Belgium", "Belgium", "Brazil", "Portugal", "France",
        "Belgium", "Indonesia", "France", "Iceland", "Democratic Republic of the Congo", "Algeria",
        "France", "Belgium", "Morocco", "Portugal", "Morocco", "France",
    ],
    "liverpool": [
        "Georgia", "Brazil", "France", "Hungary", "Netherlands", "Italy",
        "Northern Ireland", "Uruguay", "Germany", "Hungary", "Netherlands", "Argentina",
        "England", "Sweden", "France", "Netherlands", "Spain", "England",
    ],
    "manchester-city": [
        "Italy", "England", "England", "Croatia", "England", "Portugal",
        "Uzbekistan", "Portugal", "England", "France", "England", "Spain",
        "Netherlands", "Norway", "Ghana", "Belgium", "Egypt", "Brazil",
    ],
    "manchester-united": [
        "Belgium", "Wales", "France", "Argentina", "Denmark", "Netherlands",
        "England", "Portugal", "England", "Brazil", "Belgium", "Portugal",
        "Uruguay", "Cameroon", "Brazil", "Slovenia", "Côte d'Ivoire", "England",
    ],
    "napoli": [
        "Serbia", "Italy", "Italy", "Netherlands", "Uruguay", "Spain",
        "Kosovo", "Italy", "Scotland", "Scotland", "Cameroon", "Italy",
        "Slovakia", "Denmark", "Brazil", "Brazil", "Netherlands", "Italy",
    ],
    "paris-saint-germain": [
        "Russia", "France", "Ecuador", "Portugal", "Morocco", "Ukraine",
        "Brazil", "Brazil", "Portugal", "Portugal", "France", "France",
        "Spain", "Georgia", "France", "France", "France", "France",
    ],
    "porto": [
        "Portugal", "Portugal", "Poland", "Portugal", "Argentina", "Portugal",
        "Poland", "Portugal", "Denmark", "Portugal", "Argentina", "Spain",
        "Netherlands", "Spain", "Poland", "Brazil", "Spain", "Brazil",
    ],
    "psv": [
        "Czechia", "Netherlands", "Spain", "Brazil", "United States", "Netherlands",
        "France", "Netherlands", "Netherlands", "Austria", "Netherlands", "Netherlands",
        "Netherlands", "United States", "Romania", "Netherlands", "Bosnia and Herzegovina", "Morocco",
    ],
    "rb-leipzig": [
        "Belgium", "Norway", "France", "France", "Germany", "Netherlands",
        "France", "France", "Austria", "Germany", "Germany", "Austria",
        "Belgium", "Norway", "Brazil", "Belgium", "Denmark", "Nigeria",
    ],
    "real-betis": [
        "Spain", "Spain", "Brazil", "Argentina", "Spain", "Spain",
        "Dominican Republic", "Spain", "Colombia", "Spain", "Argentina", "Uruguay",
        "Mexico", "Morocco", "Brazil", "Colombia", "Spain", "Spain",
    ],
    "real-madrid": [
        "Belgium", "Ukraine", "Spain", "Spain", "England", "Spain",
        "France", "Netherlands", "England", "Uruguay", "Türkiye", "France",
        "France", "France", "Brazil", "Côte d'Ivoire", "Brazil", "Brazil",
    ],
    "roma": [
        "Serbia", "Colombia", "Brazil", "Côte d'Ivoire", "Greece", "Italy",
        "Italy", "Poland", "France", "Morocco", "Italy", "Italy",
        "Italy", "Netherlands", "Argentina", "Argentina", "France", "Argentina",
    ],
    "slavia-praha": [
        "Ukraine", "Czechia", "Czechia", "Czechia", "Nigeria", "Czechia",
        "Côte d'Ivoire", "Czechia", "Nigeria", "Czechia", "Liberia", "Czechia",
        "Mali", "Czechia", "Czechia", "Gambia", "Czechia", "Slovenia",
    ],
    "sporting": [
        "Portugal", "Portugal", "Portugal", "Uruguay", "Belgium", "Portugal",
        "Spain", "Senegal", "Uruguay", "Spain", "Italy", "Portugal",
        "Portugal", "Colombia", "Portugal", "Mozambique", "Greece", "Brazil",
    ],
    "stuttgart": [
        "Germany", "Germany", "Germany", "Netherlands", "Germany", "Germany",
        "Switzerland", "Germany", "Germany", "Morocco", "Spain", "Denmark",
        "Türkiye", "Germany", "Bosnia and Herzegovina", "Germany", "Portugal", "Germany",
    ],
    "villarreal": [
        "Brazil", "Hungary", "Portugal", "Spain", "Uruguay", "Cape Verde",
        "Spain", "United States", "Spain", "Senegal", "Spain", "Spain",
        "Senegal", "Georgia", "Morocco", "Canada", "Canada", "Côte d'Ivoire",
    ],
    "tom04": [
        "Russia", "Russia", "Russia", "Russia", "Russia", "Kazakhstan",
        "Czechia", "Russia", "Russia", "Russia", "Russia", "Russia",
        "Russia", "Russia", "Russia", "Russia", "Russia", "Russia", "Russia",
    ],
    "tom07": [
        "Estonia", "Belarus", "Russia", "Moldova", "Russia", "Croatia",
        "Lithuania", "Russia", "Russia", "Russia", "Bosnia and Herzegovina", "Belarus",
        "Russia", "Bulgaria", "Russia", "Russia", "Russia", "Russia", "Russia",
    ],
    "tom12": [
        "Czechia", "Russia", "Serbia", "Russia", "Russia", "Russia",
        "Russia", "Russia", "Russia", "South Korea", "Slovenia", "Russia",
        "Russia", "Russia", "Russia", "Russia", "Belarus", "North Macedonia", "Russia",
    ],
    "tom22": [
        "Russia", "Russia", "Belarus", "Russia", "Croatia", "Czechia",
        "Russia", "Russia", "Moldova", "Belarus", "Russia", "Russia",
        "Russia", "Russia", "Russia", "Russia", "Russia", "Russia", "Russia",
    ],
    "kdv": [
        "Russia", "Russia", "Russia", "Russia", "Russia", "Russia",
        "Russia", "Russia", "Russia", "Russia", "Russia", "Russia",
        "Russia", "Russia", "Russia", "Russia", "Russia", "Russia", "Russia",
    ],
}


def main() -> int:
    catalog_paths = sorted(
        path
        for data_root in DATA_ROOTS
        for path in data_root.rglob("cards.json")
    )
    seen_teams: set[str] = set()
    changed_cards = 0

    for catalog_path in catalog_paths:
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        team_id = catalog["teamId"]
        nationalities = NATIONALITIES.get(team_id)
        if nationalities is None:
            raise KeyError(f"No nationalities configured for {team_id}")

        player_cards = [card for card in catalog["cards"] if card.get("kind") == "player"]
        if len(player_cards) != len(nationalities):
            raise ValueError(
                f"{team_id}: {len(player_cards)} player cards but "
                f"{len(nationalities)} nationalities"
            )

        for card, nationality in zip(player_cards, nationalities, strict=True):
            if card.get("nationality") != nationality:
                card["nationality"] = nationality
                changed_cards += 1

        catalog_path.write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        seen_teams.add(team_id)

    missing_catalogs = set(NATIONALITIES) - seen_teams
    if missing_catalogs:
        raise ValueError(f"Nationality data has no matching catalog: {sorted(missing_catalogs)}")

    print(f"Updated {changed_cards} player cards in {len(catalog_paths)} catalogs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
