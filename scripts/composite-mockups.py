#!/usr/bin/env python3
"""Composite poster designs into empty listing mockup frames.

The default SM001 mockup set points at the Windows/WSL listing-image folder used
for The Mapped Moment. It places a portrait poster into each empty frame and
uses multiply blending so white poster backgrounds keep the mockup lighting and
paper shadows.
"""

from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


DEFAULT_MOCKUP_DIR = (
    r"C:\Users\PC\Desktop\Etsy The Mapped Moment\LISTINGS\SM001\listing images\temp"
)


SM001_WHITE_MOCKUPS = [
    {
        "file": "d5254671-7c1e-4b8e-b5e2-d01d54fda3a7.png",
        "box": (461, 184, 421, 570),
    },
    {
        "file": "ChatGPT Image May 5, 2026, 06_15_54 PM.png",
        "box": (396, 88, 558, 774),
    },
    {
        "file": "ChatGPT Image May 5, 2026, 05_56_19 PM.png",
        "box": (532, 114, 402, 552),
    },
    {
        "file": "ChatGPT Image May 5, 2026, 05_41_14 PM.png",
        "box": (462, 146, 536, 758),
    },
    {
        "file": "ChatGPT Image May 5, 2026, 02_02_42 AM.png",
        "box": (510, 196, 464, 652),
    },
    {
        "file": "6fd03276-597a-4cda-bf6f-6a2f5d147e5f.png",
        "box": (488, 82, 500, 710),
    },
]

SM001_DARK_MOCKUPS = [
    {
        "file": "ChatGPT Image May 6, 2026, 04_10_30 PM.png",
        "box": (464, 80, 520, 700),
    },
    {
        "file": "ChatGPT Image May 5, 2026, 06_05_02 PM.png",
        "box": (476, 78, 518, 728),
    },
]

MOCKUP_SETS = {
    "sm001-white": SM001_WHITE_MOCKUPS,
    "sm001-dark": SM001_DARK_MOCKUPS,
}


def normalize_path(raw: str) -> Path:
    """Accept Linux paths and Windows paths pasted from Explorer."""
    raw = raw.strip().strip('"')
    match = re.match(r"^([A-Za-z]):[\\/](.*)$", raw)
    if match:
        drive = match.group(1).lower()
        rest = match.group(2).replace("\\", "/")
        return Path(f"/mnt/{drive}/{rest}")
    return Path(raw).expanduser()


def fit_image(src: Image.Image, width: int, height: int, mode: str) -> Image.Image:
    src = src.convert("RGBA")
    if mode == "cover":
        scale = max(width / src.width, height / src.height)
    else:
        scale = min(width / src.width, height / src.height)

    resized = src.resize(
        (math.ceil(src.width * scale), math.ceil(src.height * scale)),
        Image.Resampling.LANCZOS,
    )

    if mode == "cover":
        left = max(0, (resized.width - width) // 2)
        top = max(0, (resized.height - height) // 2)
        return resized.crop((left, top, left + width, top + height))

    # Preserve the full poster artwork. When the physical frame opening is not
    # exactly the same ratio as the poster, fill the extra strip with the
    # poster's own background color so the border is not clipped.
    background = src.getpixel((max(0, src.width // 20), max(0, src.height // 20)))
    canvas = Image.new("RGBA", (width, height), background)
    canvas.alpha_composite(resized, ((width - resized.width) // 2, (height - resized.height) // 2))
    return canvas


def inset_box(box: tuple[int, int, int, int], inset: int) -> tuple[int, int, int, int]:
    x, y, width, height = box
    safe_inset = max(0, min(inset, (width - 1) // 2, (height - 1) // 2))
    return x + safe_inset, y + safe_inset, width - safe_inset * 2, height - safe_inset * 2


def flatten_on_white(src: Image.Image) -> Image.Image:
    if src.mode != "RGBA":
        return src.convert("RGB")
    white = Image.new("RGBA", src.size, (255, 255, 255, 255))
    white.alpha_composite(src)
    return white.convert("RGB")


def composite_design(
    mockup: Image.Image,
    design: Image.Image,
    box: tuple[int, int, int, int],
    *,
    blend: str,
    fit: str,
    opacity: float,
    inset: int,
) -> Image.Image:
    x, y, width, height = inset_box(box, inset)
    output = mockup.convert("RGB")
    poster = flatten_on_white(fit_image(design, width, height, fit))
    base = output.crop((x, y, x + width, y + height)).convert("RGB")

    if blend == "multiply":
        blended = ImageChops.multiply(base, poster)
        if opacity < 1:
            blended = Image.blend(base, blended, opacity)
    else:
        blended = Image.blend(base, poster, opacity)

    output.paste(blended, (x, y))
    return output


def make_contact_sheet(paths: list[Path], output_path: Path) -> None:
    thumb_w, thumb_h = 420, 315
    label_h = 34
    cols = 3
    rows = math.ceil(len(paths) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 16)
    except OSError:
        font = ImageFont.load_default()

    for index, path in enumerate(paths):
        img = Image.open(path).convert("RGB")
        img.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        col = index % cols
        row = index // cols
        x = col * thumb_w + (thumb_w - img.width) // 2
        y = row * (thumb_h + label_h)
        sheet.paste(img, (x, y))
        draw.text((col * thumb_w + 8, y + thumb_h + 8), path.name, fill=(20, 20, 20), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Composite poster designs into listing mockup frames.")
    parser.add_argument("--design", required=True, help="Poster/design PNG to place into the frames.")
    parser.add_argument("--mockup-dir", default=DEFAULT_MOCKUP_DIR, help="Directory containing empty mockup images.")
    parser.add_argument("--output-dir", help="Output directory. Defaults to <mockup-dir>/generated.")
    parser.add_argument("--set", default="sm001-white", choices=sorted(MOCKUP_SETS), help="Mockup placement preset.")
    parser.add_argument("--blend", default="multiply", choices=["multiply", "normal"], help="Blend mode.")
    parser.add_argument("--fit", default="contain", choices=["cover", "contain"], help="How the poster fills each frame.")
    parser.add_argument("--opacity", type=float, default=0.94, help="Blend opacity from 0 to 1.")
    parser.add_argument("--inset", type=int, default=14, help="Inset poster placement inside the frame opening, in pixels.")
    parser.add_argument("--suffix", default="", help="Optional filename suffix before .png.")
    parser.add_argument("--contact-sheet", action="store_true", help="Also create contact-sheet.png in output dir.")
    args = parser.parse_args()

    design_path = normalize_path(args.design)
    mockup_dir = normalize_path(args.mockup_dir)
    output_dir = normalize_path(args.output_dir) if args.output_dir else mockup_dir / "generated"

    if not design_path.exists():
        raise SystemExit(f"Design image not found: {design_path}")
    if not mockup_dir.exists():
        raise SystemExit(f"Mockup directory not found: {mockup_dir}")
    if not (0 <= args.opacity <= 1):
        raise SystemExit("--opacity must be between 0 and 1")

    output_dir.mkdir(parents=True, exist_ok=True)
    design = Image.open(design_path)
    outputs: list[Path] = []

    for index, item in enumerate(MOCKUP_SETS[args.set], start=1):
        source_path = mockup_dir / item["file"]
        if not source_path.exists():
            print(f"Skipping missing mockup: {source_path}")
            continue

        mockup = Image.open(source_path)
        composited = composite_design(
            mockup,
            design,
            item["box"],
            blend=args.blend,
            fit=args.fit,
            opacity=args.opacity,
            inset=args.inset,
        )
        output_path = output_dir / f"{index:02d}-{source_path.stem}{args.suffix}.png"
        composited.save(output_path)
        outputs.append(output_path)
        print(output_path)

    if args.contact_sheet and outputs:
        contact_path = output_dir / "contact-sheet.png"
        make_contact_sheet(outputs, contact_path)
        print(contact_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
