from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "public/examples/ucl/ucl-26-27-clean-no-crest-source.webp"
DATA_ROOT = ROOT / "src/data/ucl-26-27"
PUBLIC_ROOT = ROOT / "public"
GENERATED_PLACEHOLDER_IDS = {
    "ucl-26-27-bay-01",
    "ucl-26-27-bay-02",
    "ucl-26-27-bay-10",
    "ucl-26-27-bay-11",
    "ucl-26-27-bay-12",
    "ucl-26-27-bay-13",
    "ucl-26-27-bay-14",
    "ucl-26-27-bay-15",
    "ucl-26-27-bay-16",
    "ucl-26-27-bay-17",
    "ucl-26-27-bay-18",
    "ucl-26-27-bay-19",
    "ucl-26-27-bay-20",
}


def load_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    raise FileNotFoundError("A bold TrueType font is required")


def fitted_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    start_size: int,
) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 28:
        font = load_font(size)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
        size -= 2
    return load_font(size)


def create_missing_card(card: dict[str, Any], team_id: str) -> None:
    target = PUBLIC_ROOT / str(card["image"]).lstrip("/")
    if target.exists() and card["id"] not in GENERATED_PLACEHOLDER_IDS:
        return

    image = Image.open(TEMPLATE).convert("RGB")
    draw = ImageDraw.Draw(image)
    width, height = image.size
    name = str(card["displayName"]).upper()
    name_font = fitted_font(draw, name, int(width * 0.82), int(width * 0.065))
    hint_font = load_font(int(width * 0.037))
    number_font = load_font(int(width * 0.042))

    number = f"{team_id.upper()}  •  {card['cardNumber']}"
    number_box = draw.textbbox((0, 0), number, font=number_font)
    draw.text(((width - number_box[2]) / 2, int(height * 0.205)), number, font=number_font, fill="#ffffff")

    hint = "ФОТО ПОЯВИТСЯ ПОЗЖЕ"
    hint_box = draw.textbbox((0, 0), hint, font=hint_font)
    draw.text(((width - hint_box[2]) / 2, int(height * 0.57)), hint, font=hint_font, fill="#c7d1e5")

    name_box = draw.textbbox((0, 0), name, font=name_font)
    draw.text(((width - name_box[2]) / 2, int(height * 0.84)), name, font=name_font, fill="#ffffff")

    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=88, method=6)


for source_path in DATA_ROOT.glob("*/cards.json"):
    source = json.loads(source_path.read_text(encoding="utf-8"))
    for card_data in source["cards"]:
        create_missing_card(card_data, str(source["teamId"]))
