from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "assets/game/tomsk/main/cards/source/historical-placeholder-template.png"
OUTPUT_ROOT = ROOT / "public/tomsk/cards"
ERAS = (
    ("tom04", "tom04", "2000–2004"),
    ("tom07", "tom07", "2005–2007"),
    ("tom12", "tom12", "2008–2012"),
    ("tom22", "tom22", "2013–2022"),
)


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


def create_card(card: dict[str, Any], era_id: str, era_label: str) -> None:
    image = Image.open(TEMPLATE).convert("RGB")
    draw = ImageDraw.Draw(image)
    width, height = image.size
    margin = int(width * 0.07)
    header_font = load_font(int(width * 0.038))
    number_font = load_font(int(width * 0.035))
    hint_font = load_font(int(width * 0.045))
    name = str(card["displayName"]).upper()
    name_font = fitted_font(draw, name, width - margin * 2, int(width * 0.072))

    draw.text((margin, int(height * 0.035)), "ИСТОРИЯ ТОМИ", font=header_font, fill="#ffffff")
    number = f"{era_label}  •  {card['cardNumber']}"
    number_box = draw.textbbox((0, 0), number, font=number_font)
    draw.text(
        (width - margin - number_box[2], int(height * 0.038)),
        number,
        font=number_font,
        fill="#d7e5dc",
    )

    hint = "ФОТО ПОЯВИТСЯ ПОЗЖЕ"
    hint_box = draw.textbbox((0, 0), hint, font=hint_font)
    draw.text(
        ((width - hint_box[2]) / 2, int(height * 0.52)),
        hint,
        font=hint_font,
        fill="#9db5aa",
    )

    name_box = draw.textbbox((0, 0), name, font=name_font)
    draw.text(
        ((width - name_box[2]) / 2, int(height * 0.835)),
        name,
        font=name_font,
        fill="#ffffff",
    )

    file_name = Path(str(card["image"])).name
    target = OUTPUT_ROOT / era_id / file_name
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=88, method=6)


for source_dir, era_id, era_label in ERAS:
    source_path = ROOT / "src/data/tomsk" / source_dir / "cards.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    for card_data in source["cards"]:
        create_card(card_data, era_id, era_label)
