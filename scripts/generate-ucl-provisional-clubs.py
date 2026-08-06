from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "src/data/ucl-26-27"
PUBLIC_ROOT = ROOT / "public/ucl-26-27/cards"
TEMPLATE = ROOT / "public/examples/ucl/ucl-26-27-clean-no-crest-source.webp"
RARITIES = (
    "uncommon", "rare", "rare", "common", "uncommon",
    "common", "rare", "common", "uncommon", "common",
    "uncommon", "rare", "common", "epic", "uncommon",
    "common", "epic", "uncommon", "common", "legendary",
)
PLAYER_ROLES = (
    ("Goalkeeper 1", "GK"), ("Goalkeeper 2", "GK"),
    ("Defender 1", "DF"), ("Defender 2", "DF"), ("Defender 3", "DF"),
    ("Defender 4", "DF"), ("Defender 5", "DF"), ("Defender 6", "DF"),
    ("Midfielder 1", "MF"), ("Midfielder 2", "MF"), ("Midfielder 3", "MF"),
    ("Midfielder 4", "MF"), ("Midfielder 5", "MF"),
    ("Forward 1", "FW"), ("Forward 2", "FW"), ("Forward 3", "FW"),
    ("Forward 4", "FW"), ("Forward 5", "FW"),
)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in (
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    raise FileNotFoundError("A bold TrueType font is required")


def fitted_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int) -> ImageFont.FreeTypeFont:
    for size in range(start_size, 27, -2):
        font = load_font(size)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
    return load_font(28)


def centered_text(draw: ImageDraw.ImageDraw, y: int, text: str, font: ImageFont.FreeTypeFont, fill: str) -> None:
    width = draw.textbbox((0, 0), text, font=font)[2]
    draw.text(((1024 - width) / 2, y), text, font=font, fill=fill)


def slugify(value: str) -> str:
    return value.lower().replace(" ", "-")


def create_catalog(club: dict[str, Any]) -> dict[str, Any]:
    team_id = str(club["teamId"])
    code = str(club["code"])
    cards: list[dict[str, Any]] = [
        {
            "id": f"ucl-26-27-{code.lower()}-01",
            "cardNumber": "01",
            "albumSlot": 1,
            "displayName": club["displayName"],
            "image": f"/ucl-26-27/cards/{team_id}/UCL-{code}-01-team-logo.webp",
            "series": "base",
            "finish": "standard",
            "rarity": RARITIES[0],
            "kind": "team",
            "countryCode": club["countryCode"],
        },
        {
            "id": f"ucl-26-27-{code.lower()}-02",
            "cardNumber": "02",
            "albumSlot": 2,
            "displayName": f"{club['displayName']} Coach",
            "image": f"/ucl-26-27/cards/{team_id}/UCL-{code}-02-{team_id}-coach.webp",
            "series": "base",
            "finish": "standard",
            "rarity": RARITIES[1],
            "kind": "coach",
            "personId": f"{team_id}-coach",
            "role": "HEAD_COACH",
        },
    ]

    for index, (role_name, position) in enumerate(PLAYER_ROLES, start=3):
        person_id = f"{team_id}-{slugify(role_name)}"
        cards.append({
            "id": f"ucl-26-27-{code.lower()}-{index:02d}",
            "cardNumber": f"{index:02d}",
            "albumSlot": index,
            "displayName": f"{club['displayName']} · {role_name}",
            "image": f"/ucl-26-27/cards/{team_id}/UCL-{code}-{index:02d}-{person_id}.webp",
            "series": "base",
            "finish": "standard",
            "rarity": RARITIES[index - 1],
            "kind": "player",
            "personId": person_id,
            "position": position,
        })

    return {
        "schemaVersion": 2,
        "collectionId": "ucl-26-27",
        "teamId": team_id,
        "defaults": {
            "rarity": "common",
            "series": "base",
            "finish": "standard",
            "acquisition": [{"type": "pack", "poolId": "ucl-26-27-standard"}],
        },
        "cards": cards,
    }


def draw_placeholder(card: dict[str, Any], club: dict[str, Any]) -> None:
    target = ROOT / "public" / str(card["image"]).lstrip("/")
    if target.exists():
        return

    image = Image.open(TEMPLATE).convert("RGB")
    draw = ImageDraw.Draw(image)
    primary = str(club["primaryColor"])
    secondary = str(club["secondaryColor"])
    code = str(club["code"])
    number = str(card["cardNumber"])

    centered_text(draw, 315, f"{code}  •  {number}", load_font(42), "#FFFFFF")
    if card["kind"] == "team":
        draw.rounded_rectangle((305, 445, 719, 925), radius=90, fill=primary, outline=secondary, width=18)
        centered_text(draw, 610, code, load_font(112), secondary)
    else:
        draw.ellipse((405, 430, 619, 644), fill=primary, outline=secondary, width=16)
        draw.rounded_rectangle((270, 650, 754, 1050), radius=150, fill=primary, outline=secondary, width=16)
        centered_text(draw, 785, code, load_font(78), secondary)

    centered_text(draw, 1080, "IMAGE COMING SOON", load_font(34), "#C7D1E5")
    title = str(card["displayName"]).upper()
    title_font = fitted_font(draw, title, 840, 56)
    centered_text(draw, 1285, title, title_font, "#FFFFFF")
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=88, method=6)


manifest = json.loads((DATA_ROOT / "manifest.json").read_text(encoding="utf-8"))
created_catalogs = 0
created_images = 0
for club_data in manifest["clubs"]:
    catalog_path = DATA_ROOT / str(club_data["teamId"]) / "cards.json"
    if catalog_path.exists():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    else:
        catalog = create_catalog(club_data)
        catalog_path.parent.mkdir(parents=True, exist_ok=True)
        catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        created_catalogs += 1
    for card_data in catalog["cards"]:
        target = ROOT / "public" / str(card_data["image"]).lstrip("/")
        if not target.exists():
            draw_placeholder(card_data, club_data)
            created_images += 1

print(f"Created {created_catalogs} provisional UCL catalogs and {created_images} WebP placeholders.")
