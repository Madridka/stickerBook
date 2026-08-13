#!/usr/bin/env python3
"""Переносит локально изменённую надпись на исходную карточку.

Скрипт берёт прямоугольный участок из изображения, отредактированного
генератором, и накладывает его на исходную карточку. Остальные пиксели берутся
из исходника. При записи поверх исходного файла сначала создаётся временный
файл, поэтому WebP не может быть повреждён из-за ленивого декодирования.

Пример для нижней строки карточки 1024x1536:
    python scripts/merge-card-text-edit.py ^
      --source public/ucl-26-27/cards/real-madrid/UCL-RMA-13-arda-guler.webp ^
      --edited path/to/generated-edit.png
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Sequence

from PIL import Image, ImageDraw, ImageFilter


DEFAULT_BOX = (160, 1418, 870, 1481)


def parse_box(values: Sequence[int]) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = values
    if x1 < 0 or y1 < 0 or x2 <= x1 or y2 <= y1:
        raise argparse.ArgumentTypeError(
            "box должен иметь формат X1 Y1 X2 Y2 и положительную площадь"
        )
    return x1, y1, x2, y2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Перенос одной изменённой области на исходную карточку."
    )
    parser.add_argument("--source", required=True, type=Path, help="Исходная карточка")
    parser.add_argument(
        "--edited",
        required=True,
        type=Path,
        help="Карточка с исправленной генератором надписью",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Итоговый файл; по умолчанию безопасно заменяет --source",
    )
    parser.add_argument(
        "--box",
        nargs=4,
        type=int,
        metavar=("X1", "Y1", "X2", "Y2"),
        default=DEFAULT_BOX,
        help="Область переноса; по умолчанию: 160 1418 870 1481",
    )
    parser.add_argument(
        "--feather",
        type=float,
        default=2.0,
        help="Мягкость стыка в пикселях; 0 отключает растушёвку",
    )
    parser.add_argument(
        "--inset",
        type=int,
        default=5,
        help="Ширина растушёванного края внутри области",
    )
    return parser


def make_mask(size: tuple[int, int], inset: int, feather: float) -> Image.Image:
    width, height = size
    if inset < 0 or inset * 2 >= min(width, height):
        raise ValueError("inset должен быть неотрицательным и меньше половины области")

    if feather <= 0:
        return Image.new("L", size, 255)

    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rectangle(
        (inset, inset, width - inset - 1, height - inset - 1),
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(feather))


def save_image(image: Image.Image, destination: Path) -> None:
    suffix = destination.suffix.lower()
    destination.parent.mkdir(parents=True, exist_ok=True)

    if suffix == ".webp":
        image.save(destination, "WEBP", lossless=True, method=6)
    elif suffix == ".png":
        image.save(destination, "PNG", optimize=True)
    elif suffix in {".jpg", ".jpeg"}:
        image.save(destination, "JPEG", quality=95, subsampling=0)
    else:
        raise ValueError("Поддерживаются выходные форматы WebP, PNG и JPEG")


def main() -> None:
    args = build_parser().parse_args()
    box = parse_box(args.box)
    output = args.output or args.source

    with Image.open(args.source) as source_file:
        source = source_file.convert("RGB")
        source.load()
    with Image.open(args.edited) as edited_file:
        edited = edited_file.convert("RGB")
        edited.load()

    if source.size != edited.size:
        raise ValueError(
            f"Размеры изображений различаются: {source.size} и {edited.size}"
        )

    width, height = source.size
    if box[2] > width or box[3] > height:
        raise ValueError(f"Область {box} выходит за границы изображения {source.size}")

    patch = edited.crop(box)
    mask = make_mask(patch.size, args.inset, args.feather)
    source.paste(patch, box[:2], mask)

    if output.resolve() == args.source.resolve():
        temporary = output.with_name(f".{output.stem}.merge-tmp{output.suffix}")
        try:
            save_image(source, temporary)
            os.replace(temporary, output)
        finally:
            if temporary.exists():
                temporary.unlink()
    else:
        save_image(source, output)


if __name__ == "__main__":
    main()
