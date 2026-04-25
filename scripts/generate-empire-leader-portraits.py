#!/usr/bin/env python3
"""
Generate 20 empire leader portrait images for Star Freight Tycoon.
Style: 16/32-bit retro pixel art with dark space backgrounds and neon glow accents.
Matches the game's visual identity (deep blue-purple backgrounds, teal/cyan highlights).

Run from the project root: python3 scripts/generate-empire-leader-portraits.py
"""
import argparse
import base64
import os
import re
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "leaders")
LEADERS_TS = os.path.join(PROJECT_ROOT, "src", "data", "empireLeaderPortraits.ts")

env = os.environ.copy()


def load_env_file(env_file):
    if os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as env_stream:
            for line in env_stream:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()


# Load env from project root first, then allow the MCP-specific env to override it.
load_env_file(os.path.join(PROJECT_ROOT, ".env"))
load_env_file(os.path.join(PROJECT_ROOT, ".mcp", "image-gen-mcp", ".env"))

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Style constants ─────────────────────────────────────────────────────────

STYLE_BASE = (
    "Retro 16-bit pixel art character portrait in the style of Master of Orion II and Star Control. "
    "Dark space background only, using deep indigo and midnight blue (#0a0a1a, #111128). "
    "Dramatic teal/cyan neon rim lighting and subtle glow highlights (#00ffcc). "
    "Visible chunky pixel texture, limited palette (max 32 colors), dithering-based shading. "
    "SNES/Genesis-era quality, head-and-shoulders bust, square icon framing, facing slightly left. "
    "Single bust portrait only, no dossier card, no UI frame, no collectible card layout, no lower-third banner. "
    "Regal, powerful empire leader presence. NO smooth gradients. NO photorealism. "
    "ABSOLUTELY NO text, NO letters, NO words, NO numbers, NO signage, NO logos, NO symbols, NO UI elements, NO watermarks. "
    "Pure character portrait only."
)

# ── Parse empireLeaderPortraits.ts to get leader info ───────────────────────

def parse_leaders():
    """Extract leader definitions from empireLeaderPortraits.ts."""
    with open(LEADERS_TS, "r", encoding="utf-8") as leaders_stream:
        content = leaders_stream.read()

    pattern = (
        r'id:\s*"(leader-\d+)".*?'
        r'label:\s*"([^"]+)".*?'
        r'category:\s*"([^"]+)".*?'
        r'species:\s*"([^"]+)".*?'
        r'archetype:\s*"([^"]+)".*?'
        r'bio:\s*"([^"]+)".*?'
        r'appearance:\s*\n?\s*"([^"]+)"'
    )

    entries = []
    for m in re.finditer(pattern, content, re.DOTALL):
        entries.append({
            "id": m.group(1),
            "label": m.group(2),
            "category": m.group(3),
            "species": m.group(4),
            "archetype": m.group(5),
            "bio": m.group(6),
            "appearance": m.group(7),
        })
    return entries


# ── Archetype-specific visual descriptions ──────────────────────────────────

ARCHETYPE_VISUALS = {
    "emperor": "regal sovereign with crown or diadem, imperial robes, commanding gaze, aura of absolute power",
    "hiveMind": "collective consciousness avatar, neural connections visible, alien hive-being, bio-organic crown, otherworldly presence",
    "technocrat": "cybernetic administrator, data-streams and holographic interfaces, chrome implants, clinical precision",
    "warlord": "battle-hardened military commander, scarred, heavy armor with trophies, weapons visible, fierce expression",
    "plutarch": "wealthy merchant-ruler, expensive attire, gold and jewels, ornaments of commerce, smug or calculating expression",
    "council": "diplomatic representative, formal ceremonial attire, diplomatic sash and formal regalia, composed demeanor",
    "prophet": "mystical spiritual leader, glowing eyes, ethereal robes, surrounded by mystical energy",
    "overseer": "authoritarian governor, surveillance tech, military-industrial aesthetic, stern and watchful",
}


def sanitize_visual_description(text):
    replacements = {
        "holographic stock tickers orbiting": "abstract holographic light ribbons orbiting",
        "floating runic symbols": "floating mystical light motes",
        "diplomatic sash or insignia": "diplomatic sash and formal regalia",
    }

    sanitized = text
    for source, target in replacements.items():
        sanitized = sanitized.replace(source, target)
    return sanitized


def build_prompt(entry):
    """Build a generation prompt for a leader entry."""
    species = entry["species"]
    archetype = entry["archetype"]
    appearance = sanitize_visual_description(entry["appearance"])

    archetype_visual = sanitize_visual_description(
        ARCHETYPE_VISUALS.get(archetype, "powerful leader with commanding presence"),
    )

    # No-text rule is placed FIRST so the model weights it highest
    no_text_prefix = (
        "NO TEXT OF ANY KIND. NO LABELS. NO WORDS. NO CAPTIONS. NO NAME TAG. NO TITLE CARD. "
        "NO NUMBERS. NO ALIEN GLYPHS. NO RUNES. NO HUD READOUTS. NO STOCK TICKERS. "
        "NO LOWER-THIRD BAR. NO CAPTION PLAQUE. NO POSTER FRAME. NO CARD BORDER. "
        "DO NOT include any written text anywhere in the image. Pure visual portrait only. "
    )

    prompt = (
        f"{no_text_prefix}"
        f"{STYLE_BASE} "
        f"{appearance}. "
        f"{archetype_visual}. "
        f"Species: {species}."
    )
    return prompt


def parse_args():
    parser = argparse.ArgumentParser(description="Generate empire leader portraits")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate portraits even when PNG files already exist",
    )
    parser.add_argument(
        "--ids",
        nargs="+",
        metavar="LEADER_ID",
        help='Generate only specific IDs (example: --ids leader-01 leader-03)',
    )
    return parser.parse_args()


def main():
    args = parse_args()
    leaders = parse_leaders()
    print(f"Found {len(leaders)} leader definitions in empireLeaderPortraits.ts")

    if not leaders:
        print("ERROR: No leader definitions found. Check the file path and format.")
        sys.exit(1)

    # Check which already exist
    existing = set()
    if os.path.isdir(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            if filename.endswith(".png"):
                existing.add(filename.replace(".png", ""))

    if args.ids:
        requested = set(args.ids)
        known_ids = {p["id"] for p in leaders}
        unknown = sorted(requested - known_ids)
        if unknown:
            print(f"ERROR: Unknown leader IDs: {', '.join(unknown)}")
            sys.exit(1)
        leaders = [p for p in leaders if p["id"] in requested]

    if args.overwrite:
        to_generate = leaders
    else:
        to_generate = [p for p in leaders if p["id"] not in existing]

    if not to_generate:
        print("All leader portraits already exist!")
        return

    if args.overwrite:
        print(f"Overwrite mode: regenerating {len(to_generate)} portraits")
    else:
        print(f"Need to generate {len(to_generate)} portraits (skipping {len(existing)} existing)")

    # Import and setup OpenAI
    try:
        import openai
    except ImportError:
        import subprocess
        print("Installing openai package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
        import openai

    api_key = env.get("PROVIDERS__OPENAI__API_KEY", env.get("OPENAI_API_KEY", ""))
    if not api_key:
        print("ERROR: No OpenAI API key found in .env")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key, timeout=120.0, max_retries=2)

    success_count = 0
    fail_count = 0

    for i, entry in enumerate(to_generate):
        pid = entry["id"]
        prompt = build_prompt(entry)
        print(f"\n[{i+1}/{len(to_generate)}] Generating {pid} ({entry['label']}, {entry['species']} {entry['archetype']})...")
        print(f"  Prompt: {prompt[:150]}...")

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
                with open(output_path, "wb") as f:
                    f.write(img_data)
                print(f"  Saved {pid}.png ({len(img_data)} bytes)")
                success_count += 1
            elif result.data and result.data[0].url:
                import urllib.request
                output_path = os.path.join(OUTPUT_DIR, f"{pid}.png")
                urllib.request.urlretrieve(result.data[0].url, output_path)
                print(f"  Saved {pid}.png (from URL)")
                success_count += 1
            else:
                print(f"  No image data returned for {pid}")
                fail_count += 1

        except (openai.APIError, OSError, ValueError) as e:
            print(f"  ERROR: {e}")
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


if __name__ == "__main__":
    main()
