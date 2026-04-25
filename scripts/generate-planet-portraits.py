#!/usr/bin/env python3
"""
Generate planet portrait images for Star Freight Tycoon.

Usage:
  python3 scripts/generate-planet-portraits.py                # Generate ALL missing portraits
  python3 scripts/generate-planet-portraits.py terran mining   # Generate specific types
  python3 scripts/generate-planet-portraits.py --force         # Regenerate all
  python3 scripts/generate-planet-portraits.py --dry-run       # Show prompts without generating
  python3 scripts/generate-planet-portraits.py --list          # Show status of all types

Generates 1024x1024 retro pixel art planet portraits via OpenAI gpt-image-1,
saved to public/portraits/planets/planet-{type}.png.
"""
import argparse
import base64
import io
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "planets")

# ── Load API key ────────────────────────────────────────────────────────────

def load_api_key():
    env_file = os.path.join(PROJECT_ROOT, ".mcp", "image-gen-mcp", ".env")
    env = os.environ.copy()
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env.get("PROVIDERS__OPENAI__API_KEY", env.get("OPENAI_API_KEY", ""))


# ── Dark background color (matches game theme #0a0a1a) ─────────────────────
BG_COLOR = (10, 10, 26)  # #0a0a1a


def flatten_to_opaque(img_bytes, output_path):
    """Composite RGBA image onto dark background and save as opaque RGB PNG."""
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, BG_COLOR)
        bg.paste(img, mask=img.split()[3])
        img = bg
        print("  ⬛ Flattened RGBA → RGB (composited onto #0a0a1a)")
    elif img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    with open(output_path, "wb") as f:
        f.write(png_bytes)
    return png_bytes


# ── Style prompt ────────────────────────────────────────────────────────────

STYLE_BASE = (
    "Retro 16-bit pixel art planet portrait in the style of Master of Orion II and Star Control. "
    "Square composition showing the planet from orbit, game icon framing. "
    "Dark space background using deep indigo and midnight blue (#0a0a1a, #111128). "
    "Dramatic teal/cyan neon rim lighting and glow highlights (#00ffcc). "
    "Visible chunky pixels, limited color palette (max 32 colors), dithering for shading. "
    "SNES/Sega Genesis era pixel art quality. Moody sci-fi lighting. "
    "ABSOLUTELY NO text, NO words, NO letters, NO names, NO labels, NO UI elements in the image. "
    "Pure planet portrait only."
)

PLANET_PROMPTS = {
    "terran": (
        "A lush blue-green Earth-like planet seen from low orbit. "
        "Vivid blue oceans, green-brown continents with mountain ranges, "
        "wispy white cloud layers drifting across the surface. "
        "Thin blue atmospheric haze along the rim. Twin small moons in the background. "
        "Warm golden sunlight illuminating one side, deep shadow on the other. "
    ),
    "industrial": (
        "A heavily industrialized smog-covered planet seen from orbit. "
        "Dark grey-brown surface covered in sprawling factory mega-complexes, "
        "glowing orange furnace lights and rivers of molten metal visible from space. "
        "Thick brown-orange atmospheric pollution haze. "
        "Orbital shipyards and station scaffolding silhouetted in the foreground. "
        "Ominous and productive, a world of ceaseless manufacturing. "
    ),
    "mining": (
        "A barren rocky mining world seen from orbit, like an asteroid or dwarf planet. "
        "Grey-brown cratered surface with enormous strip mines and deep quarries visible from space. "
        "Glowing orange-red veins of exposed ore and magma seams criss-crossing the surface. "
        "Giant mechanical drill platforms and mining laser beams. "
        "Dust clouds rising from active excavation sites. Harsh and desolate. "
    ),
    "agricultural": (
        "A verdant agricultural paradise planet seen from orbit. "
        "Lush green continents covered in vast geometric crop fields and golden grain plains. "
        "Rolling hills, blue rivers meandering through fertile valleys. "
        "Warm golden-hour sunlight. Gentle white clouds in a clear cyan sky. "
        "Small farming settlements scattered across the landscape. Peaceful and bountiful. "
    ),
    "hubStation": (
        "A massive orbital hub station complex in deep space, seen from approach. "
        "Gleaming amber-gold metallic structure with rotating ring habitats, "
        "multiple docking arms extending outward with freight ships attached. "
        "Beacon lights and navigation signals flashing. "
        "Busy traffic of small vessels around the station. "
        "Stars and a colorful nebula in the background. Grand and bustling. "
    ),
    "resort": (
        "A stunning luxury resort planet seen from orbit. "
        "Vibrant pink-magenta and turquoise color palette. "
        "Crystal-clear azure oceans with bioluminescent coral reefs visible from space. "
        "White sand archipelago islands with gleaming resort dome complexes. "
        "Rings of orbital leisure platforms. A planet of beauty and indulgence. "
        "Soft warm lighting with dreamy pastel atmospheric glow. "
    ),
    "research": (
        "A mysterious high-tech research planet seen from orbit. "
        "Cool cyan and deep purple color palette. "
        "Surface dotted with enormous satellite dish arrays and glowing lab complexes. "
        "Pulsing energy grids and particle accelerator rings visible from space. "
        "Orbiting sensor arrays and telescope platforms. "
        "Strange aurora-like energy phenomena in the upper atmosphere. "
        "Eerie, cutting-edge, a world dedicated to unlocking cosmic secrets. "
    ),
}


# ── Main ────────────────────────────────────────────────────────────────────

ALL_TYPES = list(PLANET_PROMPTS.keys())


def main():
    parser = argparse.ArgumentParser(
        description="Generate planet portrait images for Star Freight Tycoon",
    )
    parser.add_argument("types", nargs="*", help="Planet types to generate (default: all)")
    parser.add_argument("--force", action="store_true", help="Regenerate even if file exists")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without generating")
    parser.add_argument("--list", action="store_true", help="Show status of all planet types")

    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Determine which types to generate
    types = args.types if args.types else ALL_TYPES
    invalid = [t for t in types if t not in PLANET_PROMPTS]
    if invalid:
        print(f"ERROR: Unknown planet types: {invalid}")
        print(f"Valid types: {ALL_TYPES}")
        sys.exit(1)

    # Check existing files
    existing = set()
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith("planet-") and f.endswith(".png"):
            ptype = f.replace("planet-", "").replace(".png", "")
            existing.add(ptype)

    # Handle --list
    if args.list:
        print(f"\nPlanet portraits ({len(existing)}/{len(ALL_TYPES)} generated):")
        for ptype in ALL_TYPES:
            status = "✓" if ptype in existing else "✗"
            print(f"  [{status}] planet-{ptype}.png")
        return

    # Filter existing unless --force
    to_generate = types
    if not args.force:
        to_generate = [t for t in types if t not in existing]
        skipped = len(types) - len(to_generate)
        if skipped > 0:
            print(f"Skipping {skipped} existing portraits (use --force to regenerate)")

    if not to_generate:
        print("Nothing to generate! All planet portraits exist.")
        return

    # Build prompts
    prompts = {}
    for ptype in to_generate:
        prompts[ptype] = PLANET_PROMPTS[ptype] + STYLE_BASE

    # Dry run
    if args.dry_run:
        print(f"\n[DRY RUN] Would generate {len(to_generate)} planet portraits:\n")
        for ptype in to_generate:
            print(f"planet-{ptype}.png:")
            print(f"  {prompts[ptype][:200]}...")
            print()
        return

    # ── Actual generation ───────────────────────────────────────────────────
    try:
        import openai
    except ImportError:
        import subprocess
        print("Installing openai package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
        import openai

    api_key = load_api_key()
    if not api_key:
        print("ERROR: No OpenAI API key found in .mcp/image-gen-mcp/.env or OPENAI_API_KEY env var")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key)

    success_count = 0
    fail_count = 0

    for i, ptype in enumerate(to_generate):
        prompt = prompts[ptype]
        print(f"\n[{i+1}/{len(to_generate)}] Generating planet-{ptype}.png")
        print(f"  Prompt ({len(prompt)} chars)")

        try:
            result = client.images.generate(
                model="gpt-image-1",
                prompt=prompt,
                n=1,
                size="1024x1024",
                quality="medium",
            )

            if result.data and result.data[0].b64_json:
                img_data = base64.b64decode(result.data[0].b64_json)
                output_path = os.path.join(OUTPUT_DIR, f"planet-{ptype}.png")
                img_data = flatten_to_opaque(img_data, output_path)
                size_kb = len(img_data) / 1024
                print(f"  ✓ Saved planet-{ptype}.png ({size_kb:.1f} KB)")
                success_count += 1
            else:
                print(f"  ✗ No image data returned for {ptype}")
                fail_count += 1

        except Exception as e:
            print(f"  ✗ Error generating {ptype}: {e}")
            fail_count += 1

    print(f"\n{'='*40}")
    print(f"Done: {success_count} generated, {fail_count} failed")


if __name__ == "__main__":
    main()
