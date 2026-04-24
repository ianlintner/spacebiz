#!/usr/bin/env python3
"""
generate-ship-art.py

Generates AI pixel-art sprites for all 13 ship classes using Azure OpenAI
gpt-image-2 (or gpt-image-1 fallback) and downscales to pixel-art with
nearest-neighbor interpolation + palette quantization.

Outputs:
  assets-source/ships/map/<id>.png      — 64×64 top-down map sprite (transparent bg)
  assets-source/ships/portraits/<id>.png — 128×128 3/4-view portrait (starfield bg)

Usage:
  python3 scripts/generate-ship-art.py
  python3 scripts/generate-ship-art.py --skip-existing
  python3 scripts/generate-ship-art.py --map-only
  python3 scripts/generate-ship-art.py --portraits-only
  python3 scripts/generate-ship-art.py --ship tug  # single ship
"""
import argparse
import base64
import io
import os
import sys
import time
from pathlib import Path

try:
    from openai import AzureOpenAI
except ImportError:
    print("ERROR: openai package not found. Run: pip install openai", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not found. Run: pip install pillow", file=sys.stderr)
    sys.exit(1)

# ── Config ───────────────────────────────────────────────────────────────────

AZURE_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
AZURE_API_KEY  = os.environ.get("AZURE_OPENAI_API_KEY", "")

# Deployment name — gpt-image-2 preferred, gpt-image-1 as fallback
MODEL = "gpt-image-2"

MAP_SIZE      = 64
PORTRAIT_SIZE = 128
GEN_SIZE      = "1024x1024"  # generate large, downscale to pixel art
QUALITY       = "medium"

MAP_DIR      = Path("assets-source/ships/map")
PORTRAIT_DIR = Path("assets-source/ships/portraits")

# DB32 palette (Dawnbringer 32) for pixel-art quantization
DB32 = [
    (0,0,0),(34,32,52),(69,40,60),(102,57,49),(143,86,59),(223,113,38),(217,160,102),(238,195,154),
    (251,242,54),(153,229,80),(106,190,48),(55,148,110),(75,105,47),(82,75,36),(50,60,57),(63,63,116),
    (48,96,130),(91,110,225),(99,155,255),(95,205,228),(203,219,252),(255,255,255),(155,173,183),
    (132,126,135),(105,106,106),(89,86,82),(118,66,138),(172,50,50),(217,87,99),(215,123,186),
    (143,151,74),(138,111,48)
]

# ── Ship manifest ─────────────────────────────────────────────────────────────

SHIPS = [
    dict(
        id="cargoShuttle",
        map_prompt="top-down pixel art spaceship sprite, boxy orange cargo shuttle with stubby wings and rear cargo pod, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, boxy orange cargo shuttle with stubby wings and rear cargo pod, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="passengerShuttle",
        map_prompt="top-down pixel art spaceship sprite, sleek cyan passenger shuttle with window strip and swept tail fins, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, sleek cyan passenger shuttle with window strip and swept tail fins, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="mixedHauler",
        map_prompt="top-down pixel art spaceship sprite, green mid-size hauler with cargo pod below hull and twin engine pods, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, green mid-size mixed hauler with cargo pod below and twin engine pods, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="fastCourier",
        map_prompt="top-down pixel art spaceship sprite, yellow slim dart-shape courier with swept wings and twin engines, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, yellow slim dart-shape fast courier with swept wings, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="bulkFreighter",
        map_prompt="top-down pixel art spaceship sprite, bronze wide rectangular freighter with visible container grid markings, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, bronze wide rectangular bulk freighter with container grid markings, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="starLiner",
        map_prompt="top-down pixel art spaceship sprite, blue elegant long passenger liner with two window rows and command fin, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, blue elegant star liner with two window rows and observation dome, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="megaHauler",
        map_prompt="top-down pixel art spaceship sprite, red-orange massive industrial hauler with triple engine cluster and multi-colored containers, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, red-orange massive mega hauler with triple engines and colorful cargo containers, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="luxuryLiner",
        map_prompt="top-down pixel art spaceship sprite, purple sweeping curved luxury liner with panoramic gold windows and decorative ring, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, purple sweeping luxury liner with panoramic gold windows and ornate detail ring, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="tug",
        map_prompt="top-down pixel art spaceship sprite, grey tiny stubby utility tug with oversized engine block and front grapple claw, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, grey stubby utility space tug with oversized engine and grapple claw arm, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="refrigeratedHauler",
        map_prompt="top-down pixel art spaceship sprite, white insulated cargo ship with ribbed cryo tanks and frost-blue accents, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, white refrigerated hauler with ribbed insulation panels and frost-blue cryo accents, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="armoredFreighter",
        map_prompt="top-down pixel art spaceship sprite, dark gunmetal armored freighter with thick reinforced plating and turret nub on top, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, dark gunmetal armored freighter with reinforced plating and defense turret, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="diplomaticYacht",
        map_prompt="top-down pixel art spaceship sprite, white and gold sleek diplomatic yacht with tall antenna mast and swept tail fins, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, white and gold diplomatic yacht with antenna mast and ornate gold trim, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
    dict(
        id="colonyShip",
        map_prompt="top-down pixel art spaceship sprite, sage-green massive colony ship with habitation ring cargo spine and solar panels, hull pointing right, clean hard edges, limited palette, plain transparent background, no text, no watermark",
        portrait_prompt="pixel art spaceship portrait, sage-green massive colony ship with habitation ring solar panels and long cargo spine, 3/4 perspective view, hard edges, limited palette, plain dark starfield background, no text, no watermark",
    ),
]

# ── Image processing ──────────────────────────────────────────────────────────

def nearest_palette(img: Image.Image, palette: list, size: int, transparent_bg: bool) -> Image.Image:
    """Downscale to `size`×`size` with nearest-neighbor, then quantize to palette."""
    img = img.resize((size, size), Image.NEAREST)

    if transparent_bg and img.mode != "RGBA":
        img = img.convert("RGBA")

    # Build PIL palette image for quantization
    pal_img = Image.new("P", (1, 1))
    flat = []
    for r, g, b in palette:
        flat.extend([r, g, b])
    flat.extend([0, 0, 0] * (256 - len(palette)))
    pal_img.putpalette(flat)

    if transparent_bg:
        # Separate alpha, quantize RGB, reapply alpha
        r_ch, g_ch, b_ch, a_ch = img.split()
        rgb = Image.merge("RGB", (r_ch, g_ch, b_ch))
        quantized = rgb.quantize(colors=len(palette), palette=pal_img, dither=0)
        quantized = quantized.convert("RGBA")
        quantized.putalpha(a_ch)
        return quantized
    else:
        rgb = img.convert("RGB")
        quantized = rgb.quantize(colors=len(palette), palette=pal_img, dither=0)
        return quantized.convert("RGBA")


def generate_image(client: AzureOpenAI, prompt: str) -> Image.Image:
    """Call Azure OpenAI image generation and return a PIL Image."""
    resp = client.images.generate(
        model=MODEL,
        prompt=prompt,
        size=GEN_SIZE,
        quality=QUALITY,
        n=1,
    )
    item = resp.data[0]
    # gpt-image-2 on Azure returns b64_json by default (no response_format param needed)
    if item.b64_json:
        img_bytes = base64.b64decode(item.b64_json)
    elif item.url:
        import urllib.request
        with urllib.request.urlopen(item.url) as r:
            img_bytes = r.read()
    else:
        raise ValueError("No image data in response")
    return Image.open(io.BytesIO(img_bytes)).convert("RGBA")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AI pixel-art ship sprites")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--map-only",      action="store_true")
    parser.add_argument("--portraits-only", action="store_true")
    parser.add_argument("--ship",           help="Generate only this ship id")
    args = parser.parse_args()

    if not AZURE_ENDPOINT:
        print("ERROR: AZURE_OPENAI_ENDPOINT not set", file=sys.stderr)
        sys.exit(1)

    client = AzureOpenAI(
        azure_endpoint=AZURE_ENDPOINT,
        api_key=AZURE_API_KEY if AZURE_API_KEY else None,
        api_version="2025-04-01-preview",
    )

    MAP_DIR.mkdir(parents=True, exist_ok=True)
    PORTRAIT_DIR.mkdir(parents=True, exist_ok=True)

    ships = [s for s in SHIPS if not args.ship or s["id"] == args.ship]
    if args.ship and not ships:
        print(f"ERROR: Unknown ship id '{args.ship}'", file=sys.stderr)
        sys.exit(1)

    print("╔══════════════════════════════════════════════╗")
    print("║   Star Freight Tycoon — Ship Art Generator   ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"\nProvider: Azure ({AZURE_ENDPOINT})")
    print(f"Model:    {MODEL}  quality={QUALITY}  size={GEN_SIZE}\n")

    generated = skipped = failed = 0

    for ship in ships:
        sid = ship["id"]

        # ── Map sprite ──────────────────────────────────────────────────────
        if not args.portraits_only:
            out_path = MAP_DIR / f"{sid}.png"
            if args.skip_existing and out_path.exists():
                print(f"  ✓ [skip] {sid} map sprite")
                skipped += 1
            else:
                print(f"  → Generating map sprite: {sid} ...", flush=True)
                try:
                    img = generate_image(client, ship["map_prompt"])
                    img = nearest_palette(img, DB32, MAP_SIZE, transparent_bg=True)
                    img.save(out_path, "PNG")
                    print(f"  ✓ Saved: {out_path}")
                    generated += 1
                except Exception as e:
                    print(f"  ✗ FAILED {sid} map: {e}", file=sys.stderr)
                    failed += 1
                # Pace requests to stay within Azure rate limit
                time.sleep(3)

        # ── Portrait ────────────────────────────────────────────────────────
        if not args.map_only:
            out_path = PORTRAIT_DIR / f"{sid}.png"
            if args.skip_existing and out_path.exists():
                print(f"  ✓ [skip] {sid} portrait")
                skipped += 1
            else:
                print(f"  → Generating portrait: {sid} ...", flush=True)
                try:
                    img = generate_image(client, ship["portrait_prompt"])
                    img = nearest_palette(img, DB32, PORTRAIT_SIZE, transparent_bg=False)
                    img.save(out_path, "PNG")
                    print(f"  ✓ Saved: {out_path}")
                    generated += 1
                except Exception as e:
                    print(f"  ✗ FAILED {sid} portrait: {e}", file=sys.stderr)
                    failed += 1
                time.sleep(3)

    print(f"\n{'─'*46}")
    print(f"  Generated : {generated}")
    print(f"  Skipped   : {skipped}")
    print(f"  Failed    : {failed}")
    print(f"{'─'*46}\n")

    if failed:
        print("⚠  Some sprites failed. Re-run with --skip-existing to retry only those.")
        sys.exit(1)

    print("Done. Next step:")
    print("  npm run optimize-assets")
    print("  Then commit assets-source/ships/ and public/ships/")


if __name__ == "__main__":
    main()
