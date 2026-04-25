#!/usr/bin/env python3
"""
Generate CEO portrait images for Star Freight Tycoon.

Usage:
  python3 scripts/generate-portraits.py                    # Generate ALL missing portraits
  python3 scripts/generate-portraits.py 1                  # Generate ceo-01 only
  python3 scripts/generate-portraits.py 5 10 15            # Generate ceo-05, ceo-10, ceo-15
  python3 scripts/generate-portraits.py 1-25               # Generate ceo-01 through ceo-25
  python3 scripts/generate-portraits.py 1-10 50-60         # Multiple ranges
  python3 scripts/generate-portraits.py --force 1          # Regenerate even if file exists
  python3 scripts/generate-portraits.py --dry-run 1-5      # Show prompts without generating
  python3 scripts/generate-portraits.py --info 42          # Show portrait info and prompt for an ID
  python3 scripts/generate-portraits.py --list-missing     # List all IDs that need generation

The script reads portrait definitions from src/data/portraits.ts and generates
1024x1024 retro pixel art images via OpenAI gpt-image-1.
"""
import argparse
import base64
import json
import os
import re
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "ceo")
PORTRAITS_TS = os.path.join(PROJECT_ROOT, "src", "data", "portraits.ts")
STATUS_FILE = os.path.join(PROJECT_ROOT, "scripts", ".portrait-status.json")

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
    """Composite RGBA image onto dark background and save as opaque RGB PNG.

    Returns the final PNG file bytes (for size reporting).
    """
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, BG_COLOR)
        bg.paste(img, mask=img.split()[3])  # paste using alpha as mask
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
    "Retro 16-bit pixel art character portrait in the style of Master of Orion II and Star Control. "
    "Dark space background using deep indigo and midnight blue (#0a0a1a, #111128). "
    "Dramatic teal/cyan neon rim lighting and glow highlights (#00ffcc). "
    "Visible chunky pixels, limited color palette (max 32 colors), dithering for shading. "
    "Head and shoulders bust, square composition, game avatar icon framing. "
    "SNES/Sega Genesis era pixel art quality. Moody sci-fi lighting. "
    "ABSOLUTELY NO text, NO words, NO letters, NO names, NO labels, NO UI elements in the image. "
    "Pure character portrait only."
)

SPECIES_VISUALS = {
    "Human": "human face with futuristic attire, cybernetic augmentations or gene-mods visible, sci-fi military or corporate clothing",
    "Cyborg": "partially cybernetic humanoid, exposed chrome/metal plating mixed with organic features, glowing optical sensors, neural interface ports",
    "Android": "fully synthetic humanoid, smooth white or chrome faceplate, LED eyes, elegant robotic features, no visible organic parts",
    "Insectoid": "mantis or beetle-like alien with compound eyes, chitinous exoskeleton in iridescent colors, mandibles, antennae, alien but regal bearing",
    "Reptilian": "lizard or dragon-kin alien with scaled skin, vertical slit pupils, small horns or frills, warrior-merchant bearing",
    "Crystalline": "alien made of translucent crystal formations, faceted gem-like eyes, light refracting through body, silicon-based life, geometric and alien",
    "Aquatic": "amphibious alien with smooth wet skin, gill slits, bioluminescent markings, deep-sea adapted features",
    "Cephalopod": "tentacle-faced alien like an octopus or squid, translucent skin with bioluminescent spots, multiple eyes, sinuous tendrils",
    "Avian": "bird-like alien with colorful plumage, sharp beak, intelligent raptor eyes, ceremonial feathered mantle",
    "Feline": "cat-like alien with sleek fur, large reflective eyes, pointed ears, predatory grace, ornamental collar",
    "Plant": "plant-based alien being, bark-like skin, leaf-hair, bioluminescent sap veins, wooden features",
    "Fungal": "mushroom-like alien with a cap-shaped head, mycelium-threaded skin, spore clouds, bioluminescent gills beneath cap, alien but wise",
    "Energy": "sentient intelligent gas cloud or plasma entity, swirling luminous nebula-like form contained in a vaguely humanoid shape, no solid body, crackling with arcs of electricity and light, eyes are just two bright points of plasma, floating particles and wisps of glowing gas, truly alien and non-biological",
    "Ethereal": "abstract etheric entity from another dimension, translucent ghostly floating form, impossible geometry, glowing from within with spectral light, wispy tendrils of light, partially phased out of reality, eldritch and beautiful, Lovecraftian cosmic entity but regal",
    "Ursine": "bear-like alien with thick fur, powerful build, small wise eyes, wearing ornate armor",
    "Mammalian": "large mammalian alien like an elephant or rhino, thick hide, tusks or horns, gentle giant bearing",
    "Silicon": "living stone or mineral alien, rocky craggy surface with glowing magma veins, crystal growths jutting from shoulders, alien geological features, monolithic and ancient",
    "Mechanical": "fully robotic alien intelligence, gleaming chrome and brass chassis, glowing optic sensors for eyes, exposed gears and actuators, art-deco robot design like retro sci-fi, distinct from humanoid — clearly a sentient machine species, not a cyborg",
    "Amoeboid": "floating abstract alien entity, gelatinous translucent mass with impossible internal geometry, visible organelles that glow like stars, pseudopods reaching outward, morphic and unsettling, like a living lava lamp crossed with a deep sea creature, no fixed shape",
    "Shapeshifter": "alien entity caught mid-transformation, face half-melted between two different species, mercurial quicksilver skin, features flowing like liquid metal, one eye reptilian the other insectoid, deeply uncanny and alien, beautiful but wrong",
}


# ── Parse portraits.ts ──────────────────────────────────────────────────────

def parse_portraits():
    """Extract portrait definitions from portraits.ts."""
    with open(PORTRAITS_TS, "r") as f:
        content = f.read()

    pattern = (
        r'id:\s*"(ceo-\d+)".*?'
        r'label:\s*"([^"]+)".*?'
        r'category:\s*"([^"]+)".*?'
        r'species:\s*"([^"]+)".*?'
        r'bio:\s*"([^"]+)"'
    )

    # Also try to extract optional appearance field per entry
    appearance_pattern = r'id:\s*"(ceo-\d+)".*?(?:appearance:\s*"([^"]+)")?.*?favoriteGoods'

    entries = []
    for m in re.finditer(pattern, content, re.DOTALL):
        entries.append({
            "id": m.group(1),
            "num": int(m.group(1).split("-")[1]),
            "label": m.group(2),
            "category": m.group(3),
            "species": m.group(4),
            "bio": m.group(5),
            "appearance": "",
        })

    # Extract appearance fields separately (regex with optional groups is tricky)
    for m in re.finditer(r'id:\s*"(ceo-\d+)".*?appearance:\s*"([^"]+)"', content, re.DOTALL):
        ceo_id = m.group(1)
        appearance = m.group(2)
        for e in entries:
            if e["id"] == ceo_id:
                e["appearance"] = appearance
                break

    return entries


def build_prompt(entry):
    """Build generation prompt for a portrait entry."""
    species = entry["species"]
    species_visual = SPECIES_VISUALS.get(species, "alien creature with unique features")
    appearance = entry.get("appearance", "")
    bio_short = entry["bio"][:120]

    # If there's a per-portrait appearance, use it instead of the generic species visual
    if appearance:
        visual_desc = f"{species_visual}. {appearance}"
    else:
        visual_desc = species_visual

    return (
        f"{visual_desc}. "
        f"{bio_short}. "
        f"{STYLE_BASE}"
    )


# ── Status tracking ─────────────────────────────────────────────────────────

def load_status():
    """Load generation status from JSON file."""
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_status(status):
    """Save generation status to JSON file."""
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)


# ── Parse CLI arguments ─────────────────────────────────────────────────────

def parse_id_args(args):
    """Parse ID arguments: supports single IDs (5), ranges (1-25), and mixed."""
    ids = set()
    for arg in args:
        if "-" in arg and not arg.startswith("-"):
            parts = arg.split("-")
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                start, end = int(parts[0]), int(parts[1])
                for i in range(start, end + 1):
                    ids.add(i)
            else:
                # Could be a single number like "5"
                if arg.isdigit():
                    ids.add(int(arg))
        elif arg.isdigit():
            ids.add(int(arg))
    return sorted(ids)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate CEO portrait images for Star Freight Tycoon",
        epilog="Examples:\n"
               "  %(prog)s 1-5          Generate ceo-01 through ceo-05\n"
               "  %(prog)s 42           Generate ceo-42 only\n"
               "  %(prog)s --force 1    Regenerate ceo-01 even if it exists\n"
               "  %(prog)s --dry-run    Show all prompts without generating\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("ids", nargs="*", help="Portrait IDs or ranges (e.g., 1 5 10-20)")
    parser.add_argument("--force", action="store_true", help="Regenerate even if file exists")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without generating")
    parser.add_argument("--info", type=int, help="Show portrait info and prompt for a single ID")
    parser.add_argument("--list-missing", action="store_true", help="List all IDs that need generation")
    parser.add_argument("--list-all", action="store_true", help="List all portrait IDs with status")

    args = parser.parse_args()

    # Parse all portraits
    portraits = parse_portraits()
    portrait_map = {p["num"]: p for p in portraits}
    print(f"Loaded {len(portraits)} portrait definitions from portraits.ts")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Determine which files already exist
    existing = set()
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith("ceo-") and f.endswith(".png"):
            num_str = f.replace("ceo-", "").replace(".png", "")
            if num_str.isdigit():
                existing.add(int(num_str))

    # Handle --list-missing
    if args.list_missing:
        missing = sorted(set(p["num"] for p in portraits) - existing)
        print(f"\nMissing portraits ({len(missing)}/{len(portraits)}):")
        for num in missing:
            p = portrait_map[num]
            print(f"  ceo-{num:02d}: {p['label']} ({p['species']})")
        return

    # Handle --list-all
    if args.list_all:
        print(f"\nAll portraits ({len(existing)}/{len(portraits)} generated):")
        for p in portraits:
            status = "✓" if p["num"] in existing else "✗"
            print(f"  [{status}] ceo-{p['num']:02d}: {p['label']} ({p['species']})")
        return

    # Handle --info
    if args.info is not None:
        num = args.info
        if num not in portrait_map:
            print(f"ERROR: ceo-{num:02d} not found in portraits.ts")
            sys.exit(1)
        p = portrait_map[num]
        prompt = build_prompt(p)
        file_exists = num in existing
        print(f"\n{'='*60}")
        print(f"Portrait: ceo-{num:02d}")
        print(f"Label:    {p['label']}")
        print(f"Species:  {p['species']} ({p['category']})")
        print(f"Bio:      {p['bio']}")
        print(f"File:     {'EXISTS' if file_exists else 'MISSING'}")
        print(f"{'='*60}")
        print(f"Prompt ({len(prompt)} chars):")
        print(prompt)
        return

    # Determine which IDs to generate
    if args.ids:
        requested_ids = parse_id_args(args.ids)
        if not requested_ids:
            print("ERROR: No valid IDs parsed from arguments")
            sys.exit(1)
        # Filter to only IDs that exist in portraits.ts
        valid_ids = [i for i in requested_ids if i in portrait_map]
        invalid_ids = [i for i in requested_ids if i not in portrait_map]
        if invalid_ids:
            print(f"WARNING: Skipping IDs not in portraits.ts: {invalid_ids}")
        to_generate = [portrait_map[i] for i in valid_ids]
    else:
        # Generate all
        to_generate = portraits

    # Filter out existing unless --force
    if not args.force:
        before = len(to_generate)
        to_generate = [p for p in to_generate if p["num"] not in existing]
        skipped = before - len(to_generate)
        if skipped > 0:
            print(f"Skipping {skipped} existing portraits (use --force to regenerate)")

    if not to_generate:
        print("Nothing to generate!")
        return

    # Dry run: show prompts
    if args.dry_run:
        print(f"\n[DRY RUN] Would generate {len(to_generate)} portraits:\n")
        for p in to_generate:
            prompt = build_prompt(p)
            print(f"ceo-{p['num']:02d} ({p['label']}, {p['species']}):")
            print(f"  {prompt[:200]}...")
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
        print("ERROR: No OpenAI API key found in .mcp/image-gen-mcp/.env")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key)
    status = load_status()

    success_count = 0
    fail_count = 0

    for i, entry in enumerate(to_generate):
        pid = entry["id"]
        num = entry["num"]
        prompt = build_prompt(entry)
        print(f"\n[{i+1}/{len(to_generate)}] Generating {pid} — {entry['label']} ({entry['species']})")
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
                output_path = os.path.join(OUTPUT_DIR, f"{pid}.png")
                # Post-process: flatten transparency onto dark background
                img_data = flatten_to_opaque(img_data, output_path)
                size_kb = len(img_data) / 1024
                print(f"  ✓ Saved {pid}.png ({size_kb:.1f} KB)")
                status[pid] = {
                    "generated": True,
                    "size_bytes": len(img_data),
                    "species": entry["species"],
                    "label": entry["label"],
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }
                save_status(status)
                success_count += 1
            else:
                print(f"  ✗ No image data returned for {pid}")
                fail_count += 1

        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            status[pid] = {
                "generated": False,
                "error": str(e),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            save_status(status)
            fail_count += 1
            if "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 30s...")
                time.sleep(30)
            continue

        # Brief pause between requests
        if i < len(to_generate) - 1:
            time.sleep(1.5)

    print(f"\n{'='*60}")
    print(f"Done! Generated: {success_count}, Failed: {fail_count}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Status: {STATUS_FILE}")


if __name__ == "__main__":
    main()
