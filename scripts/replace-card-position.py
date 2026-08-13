#!/usr/bin/env python3
"""Переносит исправленную позицию игрока на исходную карточку.

Скрипт копирует только узкую область с позицией из отредактированного
изображения. Поэтому лицо, форма, фон и остальные надписи всегда остаются
пиксель-в-пиксель из исходной карточки.

Пример:
    python scripts/replace-card-position.py \
        --source public/wc-26/cards/new-zealand/NZL-19-callum-mccowatt.webp \
        --edited path/to/card-with-correct-position.png

Если исходник находится внутри public, существующая одноимённая копия внутри
dist обновляется автоматически. Для набора карточек команду можно вызывать
повторно с разными парами --source/--edited.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageFilter


# Внутренняя часть строки позиции на карточках WC 2026 размером 1024x1536.
DEFAULT_BOX = (280, 1394, 744, 1450)
REFERENCE_SIZE = (1024, 1536)


def parse_box(values: Sequence[int]) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = values
    if x1 < 0 or y1 < 0 or x2 <= x1 or y2 <= y1:
        raise argparse.ArgumentTypeError(
            "box должен иметь формат X1 Y1 X2 Y2 и положительную площадь"
        )
    return x1, y1, x2, y2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Заменяет только надпись позиции на карточке WebP/PNG/JPEG."
    )
    parser.add_argument("--source", required=True, type=Path, help="Исходная карточка")
    parser.add_argument(
        "--edited",
        required=True,
        type=Path,
        help="Карточка с уже исправленной позицией",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Выходной файл; по умолчанию безопасно заменяет --source",
    )
    parser.add_argument(
        "--box",
        nargs=4,
        type=int,
        metavar=("X1", "Y1", "X2", "Y2"),
        default=DEFAULT_BOX,
        help="Область позиции для карточки 1024x1536; масштабируется автоматически",
    )
    parser.add_argument(
        "--edited-box",
        nargs=4,
        type=int,
        metavar=("X1", "Y1", "X2", "Y2"),
        help="Отдельная область позиции на эталоне, если строка находится на другой высоте",
    )
    parser.add_argument(
        "--feather",
        type=float,
        default=2.0,
        help="Растушёвка края области в пикселях; по умолчанию 2",
    )
    parser.add_argument(
        "--no-sync-dist",
        action="store_true",
        help="Не обновлять одноимённую копию в dist для исходника из public",
    )
    return parser


def scaled_box(
    box: tuple[int, int, int, int], size: tuple[int, int]
) -> tuple[int, int, int, int]:
    if size == REFERENCE_SIZE:
        return box
    scale_x = size[0] / REFERENCE_SIZE[0]
    scale_y = size[1] / REFERENCE_SIZE[1]
    return (
        round(box[0] * scale_x),
        round(box[1] * scale_y),
        round(box[2] * scale_x),
        round(box[3] * scale_y),
    )


def make_mask(size: tuple[int, int], feather: float) -> Image.Image:
    if feather <= 0:
        return Image.new("L", size, 255)

    inset = max(3, round(feather * 2))
    if inset * 2 >= min(size):
        raise ValueError("Слишком большая растушёвка для выбранной области")

    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rectangle(
        (inset, inset, size[0] - inset - 1, size[1] - inset - 1),
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(feather))


def save_image(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    suffix = destination.suffix.lower()
    if suffix == ".webp":
        image.save(destination, "WEBP", quality=95, method=6)
    elif suffix == ".png":
        image.save(destination, "PNG", optimize=True)
    elif suffix in {".jpg", ".jpeg"}:
        image.save(destination, "JPEG", quality=95, subsampling=0)
    else:
        raise ValueError("Поддерживаются выходные форматы WebP, PNG и JPEG")


def atomic_save(image: Image.Image, destination: Path) -> None:
    temporary = destination.with_name(
        f".{destination.stem}.position-tmp{destination.suffix}"
    )
    try:
        save_image(image, temporary)
        os.replace(temporary, destination)
    finally:
        if temporary.exists():
            temporary.unlink()


def find_dist_mirror(source: Path) -> Path | None:
    resolved = source.resolve()
    parts = resolved.parts
    public_indexes = [index for index, part in enumerate(parts) if part == "public"]
    if not public_indexes:
        return None
    index = public_indexes[-1]
    mirror = Path(*parts[:index], "dist", *parts[index + 1 :])
    return mirror if mirror.exists() else None


def unique_destinations(paths: Iterable[Path]) -> list[Path]:
    result: list[Path] = []
    seen: set[Path] = set()
    for path in paths:
        resolved = path.resolve()
        if resolved not in seen:
            result.append(path)
            seen.add(resolved)
    return result


def main() -> None:
    args = build_parser().parse_args()
    source_path = args.source.resolve()
    edited_path = args.edited.resolve()

    with Image.open(source_path) as source_file:
        source = source_file.convert("RGB")
        source.load()
    with Image.open(edited_path) as edited_file:
        edited = edited_file.convert("RGB")
        edited.load()

    if source.size != edited.size and args.edited_box is None:
        source_ratio = source.width / source.height
        edited_ratio = edited.width / edited.height
        ratio_delta = abs(source_ratio - edited_ratio) / source_ratio
        if ratio_delta > 0.02:
            raise ValueError(
                "Пропорции изображений слишком сильно различаются: "
                f"{source.size} и {edited.size}"
            )
    box = scaled_box(parse_box(args.box), source.size)
    if box[2] > source.width or box[3] > source.height:
        raise ValueError(f"Область {box} выходит за границы изображения {source.size}")

    edited_box_values = args.edited_box or args.box
    edited_box = scaled_box(parse_box(edited_box_values), edited.size)
    if edited_box[2] > edited.width or edited_box[3] > edited.height:
        raise ValueError(
            f"Область эталона {edited_box} выходит за границы изображения {edited.size}"
        )

    patch = edited.crop(edited_box)
    target_size = (box[2] - box[0], box[3] - box[1])
    if patch.size != target_size:
        patch = patch.resize(target_size, Image.Resampling.LANCZOS)
    source.paste(patch, box[:2], make_mask(patch.size, args.feather))

    output = args.output.resolve() if args.output else source_path
    destinations = [output]
    if not args.output and not args.no_sync_dist:
        mirror = find_dist_mirror(source_path)
        if mirror is not None:
            destinations.append(mirror)

    for destination in unique_destinations(destinations):
        atomic_save(source, destination)
        print(destination)


if __name__ == "__main__":
    main()
