#!/usr/bin/env python3
"""
Generate 100 CEO portrait images for Star Freight Tycoon.
Style: 16/32-bit retro pixel art with dark space backgrounds and neon glow accents.
Matches the game's visual identity (deep blue-purple backgrounds, teal/cyan highlights).

Run from the project root: python3 scripts/generate-ceo-portraits.py
"""
import base64
import os
import re
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "ceo")
PORTRAITS_TS = os.path.join(PROJECT_ROOT, "src", "data", "portraits.ts")

# Load env from .mcp/image-gen-mcp/.env
env_file = os.path.join(PROJECT_ROOT, ".mcp", "image-gen-mcp", ".env")
env = os.environ.copy()
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Style constants ─────────────────────────────────────────────────────────

STYLE_BASE = (
    "16-bit retro pixel art character portrait, "
    "dark space background with deep blue-purple tones (#0a0a1a to #111128), "
    "subtle neon teal/cyan glow highlights (#00ffcc), "
    "visible pixel texture with careful anti-aliasing, limited color palette with dithering, "
    "SNES/Genesis-era quality pixel art, head and shoulders bust composition, "
    "dramatic rim lighting in teal/cyan, monospace-HUD aesthetic, "
    "reminiscent of Master of Orion II and Star Control character portraits. "
    "256x256 icon-friendly, facing slightly left. NO smooth gradients, NO photorealism."
)

# ── Parse portraits.ts to get character info ────────────────────────────────

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

    entries = []
    for m in re.finditer(pattern, content, re.DOTALL):
        entries.append({
            "id": m.group(1),
            "label": m.group(2),
            "category": m.group(3),
            "species": m.group(4),
            "bio": m.group(5),
        })
    return entries


# ── Species-specific visual descriptions ────────────────────────────────────

SPECIES_VISUALS = {
    "Human": "human face with futuristic attire, cybernetic augmentations or gene-mods visible, sci-fi military or corporate clothing",
    "Cyborg": "partially cybernetic humanoid, exposed chrome/metal plating mixed with organic features, glowing optical sensors, neural interface ports",
    "Android": "fully synthetic humanoid, smooth white or chrome faceplate, LED eyes, elegant robotic features, no visible organic parts",
    "Insectoid": "mantis or beetle-like alien with compound eyes, chitinous exoskeleton in iridescent colors, mandibles, antennae, alien but regal bearing",
    "Reptilian": "lizard or dragon-kin alien with scaled skin, vertical slit pupils, small horns or frills, warrior-merchant bearing",
    "Crystalline": "alien made of translucent crystal formations, faceted gem-like eyes, light refracting through body, silicon-based life",
    "Aquatic": "amphibious alien with smooth wet skin, gill slits, bioluminescent markings, deep-sea adapted features",
    "Cephalopod": "tentacle-faced alien like an octopus or squid, translucent skin with bioluminescent spots, multiple eyes, sinuous tendrils",
    "Avian": "bird-like alien with colorful plumage, sharp beak, intelligent raptor eyes, ceremonial feathered mantle",
    "Feline": "cat-like alien with sleek fur, large reflective eyes, pointed ears, predatory grace, ornamental collar",
    "Plant": "plant-based alien being, bark-like skin, leaf-hair, bioluminescent sap veins, wooden features",
    "Fungal": "mushroom-like alien with a cap-shaped head, mycelium-threaded skin, spore clouds, bioluminescent gills",
    "Energy": "being of pure energy or plasma, luminous translucent form, crackling with light, ethereal and powerful",
    "Ethereal": "ghostly translucent alien, glowing from within, wispy tendrils, ancient and otherworldly presence",
    "Ursine": "bear-like alien with thick fur, powerful build, small wise eyes, wearing ornate armor",
    "Mammalian": "large mammalian alien like an elephant or rhino, thick hide, tusks or horns, gentle giant bearing",
    "Silicon": "living stone or mineral alien, rocky surface with glowing veins, crystal growths, geological features",
    "Mechanical": "living machine alien, gears and pistons visible, symbiotic organic-mechanical hybrid, industrial aesthetic",
    "Amoeboid": "gelatinous blob-like alien, translucent with visible organelles, pseudopods, morphic and unsettling",
    "Shapeshifter": "alien in mid-transformation, features partially morphed, mercurial appearance, unsettling beauty",
}


def build_prompt(entry):
    """Build a generation prompt for a portrait entry."""
    species = entry["species"]
    label = entry["label"]
    bio = entry["bio"]
    category = entry["category"]

    species_visual = SPECIES_VISUALS.get(
        species,
        SPECIES_VISUALS.get(category.capitalize(), "alien creature with unique features"),
    )

    bio_short = bio[:120] if len(bio) > 120 else bio

    prompt = (
        f"{species_visual}. "
        f"Character: {label}, {bio_short}. "
        f"{STYLE_BASE}"
    )
    return prompt


def main():
    portraits = parse_portraits()
    print(f"Found {len(portraits)} portrait definitions in portraits.ts")

    # Check which already exist
    existing = set()
    if os.path.isdir(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith(".png"):
                existing.add(f.replace(".png", ""))

    to_generate = [p for p in portraits if p["id"] not in existing]

    if not to_generate:
        print("All portraits already exist!")
        return

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

    client = openai.OpenAI(api_key=api_key)

    success_count = 0
    fail_count = 0

    for i, entry in enumerate(to_generate):
        pid = entry["id"]
        prompt = build_prompt(entry)
        print(f"\n[{i+1}/{len(to_generate)}] Generating {pid} ({entry['label']}, {entry['species']})...")
        print(f"  Prompt: {prompt[:120]}...")

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

        except Exception as e:
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
