#!/usr/bin/env python3
"""Convert PNG images to WebP and remove sources after successful conversion."""

from __future__ import annotations

import argparse
import os
import stat
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image
except ImportError as error:
    raise SystemExit(
        "Pillow is required: install it with `python -m pip install Pillow`."
    ) from error


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Recursively convert PNG files to WebP. Relative paths are resolved "
            "from the project root."
        )
    )
    parser.add_argument("paths", nargs="+", type=Path, help="PNG files or directories")
    parser.add_argument(
        "--quality",
        type=int,
        default=90,
        choices=range(1, 101),
        metavar="1-100",
        help="lossy WebP quality (default: 90)",
    )
    parser.add_argument(
        "--lossless",
        action="store_true",
        help="use lossless WebP compression; --quality is ignored",
    )
    parser.add_argument(
        "--keep-source",
        action="store_true",
        help="keep PNG files after successful conversion",
    )
    return parser.parse_args()


def resolve_input(path: Path) -> Path:
    absolute = path if path.is_absolute() else PROJECT_ROOT / path
    absolute = Path(os.path.abspath(absolute))
    try:
        absolute.relative_to(PROJECT_ROOT)
    except ValueError as error:
        raise ValueError(f"Path is outside the project root: {absolute}") from error
    return absolute


def is_link(path: Path) -> bool:
    attributes = getattr(path.lstat(), "st_file_attributes", 0)
    reparse_point = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    return path.is_symlink() or bool(attributes & reparse_point)


def ensure_no_links(path: Path) -> None:
    relative = path.relative_to(PROJECT_ROOT)
    current = PROJECT_ROOT
    for part in relative.parts:
        current /= part
        if is_link(current):
            raise ValueError(f"Symbolic links and junctions are not supported: {current}")


def collect_png_files(paths: list[Path]) -> list[Path]:
    files: set[Path] = set()

    for raw_path in paths:
        path = resolve_input(raw_path)
        if not path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")
        ensure_no_links(path)

        if path.is_file():
            if path.suffix.lower() != ".png":
                raise ValueError(f"Expected a PNG file: {path}")
            files.add(path)
            continue

        for candidate in path.rglob("*"):
            if candidate.is_file() and candidate.suffix.lower() == ".png":
                ensure_no_links(candidate)
                files.add(candidate.resolve())

    return sorted(files, key=lambda item: str(item).lower())


def convert_image(source: Path, *, quality: int, lossless: bool) -> Path:
    destination = source.with_suffix(".webp")
    temporary_path: Path | None = None

    try:
        with Image.open(source) as image:
            image.load()
            has_alpha = image.mode in {"RGBA", "LA"} or (
                image.mode == "P" and "transparency" in image.info
            )
            converted = image.convert("RGBA" if has_alpha else "RGB")

            metadata = {}
            if icc_profile := image.info.get("icc_profile"):
                metadata["icc_profile"] = icc_profile
            if exif := image.info.get("exif"):
                metadata["exif"] = exif

            with tempfile.NamedTemporaryFile(
                dir=source.parent,
                prefix=f".{source.stem}-",
                suffix=".webp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)

            save_options = {
                "format": "WEBP",
                "method": 6,
                "lossless": lossless,
                **metadata,
            }
            if not lossless:
                save_options["quality"] = quality

            converted.save(temporary_path, **save_options)

        if temporary_path.stat().st_size == 0:
            raise RuntimeError(f"Encoder created an empty file for {source}")

        os.replace(temporary_path, destination)
        return destination
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def main() -> int:
    args = parse_args()

    try:
        sources = collect_png_files(args.paths)
    except (FileNotFoundError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    if not sources:
        print("No PNG files found.")
        return 0

    converted_size = 0
    source_size = 0

    for source in sources:
        original_size = source.stat().st_size
        destination = convert_image(
            source,
            quality=args.quality,
            lossless=args.lossless,
        )
        if not args.keep_source:
            source.unlink()

        source_size += original_size
        converted_size += destination.stat().st_size
        print(f"{source.relative_to(PROJECT_ROOT)} -> {destination.name}")

    saved_size = source_size - converted_size
    print(
        f"Converted {len(sources)} file(s): "
        f"{source_size:,} -> {converted_size:,} bytes "
        f"({saved_size:,} bytes saved)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
