#!/usr/bin/env python3
"""
Generate hub room portrait images for Star Freight Tycoon.

Usage:
  python3 scripts/generate-room-portraits.py                    # Generate ALL missing portraits
  python3 scripts/generate-room-portraits.py simpleTerminal     # Generate specific rooms
  python3 scripts/generate-room-portraits.py --force            # Regenerate all
  python3 scripts/generate-room-portraits.py --dry-run          # Show prompts without generating
  python3 scripts/generate-room-portraits.py --list             # Show status of all rooms

Generates 1024x1024 retro pixel art room portraits via OpenAI gpt-image-1,
saved to public/portraits/rooms/room-{type}.png.
"""
import argparse
import base64
import io
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "rooms")

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
    "Retro 16-bit pixel art space station room interior in the style of Master of Orion II and Star Control. "
    "Square composition, game icon portrait framing, showing the room from an isometric or front cutaway view. "
    "Dark space station background using deep indigo and midnight blue (#0a0a1a, #111128). "
    "Dramatic teal/cyan neon rim lighting and glow highlights (#00ffcc). "
    "Visible chunky pixels, limited color palette (max 32 colors), dithering for shading. "
    "SNES/Sega Genesis era pixel art quality. Moody sci-fi lighting with ambient glow from equipment. "
    "ABSOLUTELY NO text, NO words, NO letters, NO names, NO labels, NO UI elements in the image. "
    "Pure room interior portrait only."
)

ROOM_PROMPTS = {
    "simpleTerminal": (
        "A basic space station communications terminal room. "
        "Simple console with glowing cyan holographic displays and blinking indicator lights. "
        "A single operator chair facing a curved screen showing star maps and trade data. "
        "Exposed conduits and cables on the ceiling. Modest but functional. "
        "Teal and blue color scheme with amber warning lights. "
    ),
    "improvedTerminal": (
        "An upgraded space station command terminal room. "
        "Multiple holographic screens arranged in a semicircle showing trade routes and cargo data. "
        "Sleek consoles with glowing blue touch panels. Improved lighting fixtures. "
        "A central holographic projector displaying a rotating 3D star map. "
        "Cleaner design than basic terminal, chrome and cyan color scheme. "
    ),
    "advancedTerminal": (
        "A state-of-the-art space station command center. "
        "Massive wraparound holographic displays filling the room with glowing data streams. "
        "Advanced AI core in the center pulsing with blue energy. "
        "Multiple operator stations with ergonomic chairs and neural interface headsets. "
        "Premium materials, polished chrome surfaces, intense blue-white lighting. Elite and powerful. "
    ),
    "tradeOffice": (
        "A space station trade office and administrative bureau. "
        "Wooden-style desk (space wood) with holographic document displays floating above it. "
        "Filing systems with glowing data crystals organized on shelves. "
        "A large viewscreen showing trade agreements and empire maps. "
        "Green and amber lighting suggesting commerce and bureaucracy. Professional atmosphere. "
    ),
    "passengerLounge": (
        "A luxurious space station passenger lounge. "
        "Comfortable curved seating areas with glowing ambient lighting underneath. "
        "A large panoramic window showing stars and passing ships. "
        "A small bar area with exotic glowing beverages. Potted alien plants. "
        "Warm purple and magenta lighting with soft ambient glow. Inviting and comfortable. "
    ),
    "oreProcessing": (
        "A rugged space station ore processing facility. "
        "Heavy industrial machinery with conveyor belts carrying raw ore chunks. "
        "Glowing orange smelting furnaces and crushing equipment. "
        "Sparks flying from grinding wheels. Thick pipes and ventilation ducts. "
        "Orange and brown industrial color scheme with amber warning lights. Gritty and productive. "
    ),
    "foodTerminal": (
        "A space station hydroponics bay and food production facility. "
        "Rows of glowing green hydroponic growth pods with alien plants growing inside. "
        "UV grow lights casting purple-green illumination. "
        "Water recycling tubes and nutrient dispensing systems. "
        "Lush green and cyan color scheme. A pocket of nature amid cold metal. "
    ),
    "techTerminal": (
        "A space station data nexus and tech analysis laboratory. "
        "Banks of server towers with blinking lights and cooling fans. "
        "Holographic data streams flowing between processing nodes. "
        "A central analysis terminal with spinning data visualization. "
        "Cool cyan and electric blue color scheme with white data light trails. High-tech and cerebral. "
    ),
    "luxuryTerminal": (
        "A space station luxury arcade and entertainment hub. "
        "Glowing neon gaming machines and holographic entertainment displays. "
        "A roulette-style game table with floating golden chips. "
        "Plush seating and crystalline light fixtures. "
        "Gold, amber, and warm white lighting. Opulent and indulgent. "
    ),
    "hazmatTerminal": (
        "A space station hazardous materials containment facility. "
        "Sealed containment pods with glowing green/yellow hazardous substances inside. "
        "Heavy blast doors and decontamination chambers. "
        "Warning stripes on the floor, radiation symbols on containers. "
        "Orange and red warning lighting with green toxic glow. Dangerous but controlled. "
    ),
    "medicalTerminal": (
        "A space station medical wing and clinic. "
        "Clean white medical beds with holographic vital sign monitors above each. "
        "A surgical robot arm folded in standby mode. Medicine dispensing cabinets. "
        "Soft pink and white lighting with blue sterile UV strips. "
        "Calming and clinical atmosphere. Emergency medical equipment on the walls. "
    ),
    "fuelDepot": (
        "A space station fuel depot and refueling facility. "
        "Large cylindrical fuel tanks with glowing blue energy plasma inside. "
        "Fuel pumping mechanisms and pressure gauges with analog dials. "
        "Heavy-duty fuel hose connections leading to docking ports. "
        "Blue and steel grey color scheme with cyan energy glow. Industrial and essential. "
    ),
    "marketExchange": (
        "A space station market exchange trading floor. "
        "Multiple holographic ticker displays showing commodity prices scrolling. "
        "Trader booths arranged in a semicircle around a central price board. "
        "Glowing green and red price indicators. Busy and dynamic energy. "
        "Gold and green color scheme suggesting wealth and commerce. "
    ),
    "customsBureau": (
        "A space station customs bureau and border control office. "
        "Inspection scanners and cargo X-ray holographic displays. "
        "Official-looking desks with stamp machines and credential readers. "
        "Security barriers and checkpoint gates with scanning arches. "
        "Muted green and grey institutional color scheme. Authoritative and orderly. "
    ),
    "repairBay": (
        "A space station ship repair bay and maintenance dock. "
        "A small ship partially visible in a docking cradle being worked on. "
        "Robotic welding arms with bright orange sparks. Tool racks on the walls. "
        "Diagnostic screens showing ship schematics and condition readouts. "
        "Red-orange and metallic color scheme with bright welding light. Hardworking and mechanical. "
    ),
    "researchLab": (
        "A space station research laboratory. "
        "Microscope-like devices with holographic lenses examining alien specimens. "
        "Bubbling chemistry equipment with colorful glowing liquids. "
        "A whiteboard-style holographic display covered in equations and diagrams. "
        "Cool cyan and purple lighting with scattered experiment glow. Intellectual and mysterious. "
    ),
    "cargoWarehouse": (
        "A space station cargo warehouse and storage facility. "
        "Stacks of standardized cargo containers in neat rows stretching back into darkness. "
        "Automated loader robots moving crates on magnetic tracks. "
        "Inventory holographic displays on container sides. "
        "Brown and amber warehouse lighting. Organized and industrial. "
    ),
    "securityOffice": (
        "A space station security office and surveillance center. "
        "Wall of security camera feeds showing different station areas on screens. "
        "A weapons locker with energy rifles visible behind glass. "
        "Security console with alert systems and communication equipment. "
        "Red and dark grey color scheme with red alert lighting. Vigilant and intimidating. "
    ),
}


# ── Main ────────────────────────────────────────────────────────────────────

ALL_TYPES = list(ROOM_PROMPTS.keys())


def main():
    parser = argparse.ArgumentParser(
        description="Generate hub room portrait images for Star Freight Tycoon",
    )
    parser.add_argument("types", nargs="*", help="Room types to generate (default: all)")
    parser.add_argument("--force", action="store_true", help="Regenerate even if file exists")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without generating")
    parser.add_argument("--list", action="store_true", help="Show status of all room types")

    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Determine which types to generate
    types = args.types if args.types else ALL_TYPES
    invalid = [t for t in types if t not in ROOM_PROMPTS]
    if invalid:
        print(f"ERROR: Unknown room types: {invalid}")
        print(f"Valid types: {ALL_TYPES}")
        sys.exit(1)

    # Check existing files
    existing = set()
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith("room-") and f.endswith(".png"):
            rtype = f.replace("room-", "").replace(".png", "")
            existing.add(rtype)

    # Handle --list
    if args.list:
        print(f"\nRoom portraits ({len(existing)}/{len(ALL_TYPES)} generated):")
        for rtype in ALL_TYPES:
            status = "✓" if rtype in existing else "✗"
            print(f"  [{status}] room-{rtype}.png")
        return

    # Filter existing unless --force
    to_generate = types
    if not args.force:
        to_generate = [t for t in types if t not in existing]
        skipped = len(types) - len(to_generate)
        if skipped > 0:
            print(f"Skipping {skipped} existing portraits (use --force to regenerate)")

    if not to_generate:
        print("Nothing to generate! All room portraits exist.")
        return

    # Build prompts
    prompts = {}
    for rtype in to_generate:
        prompts[rtype] = ROOM_PROMPTS[rtype] + STYLE_BASE

    # Dry run
    if args.dry_run:
        print(f"\n[DRY RUN] Would generate {len(to_generate)} room portraits:\n")
        for rtype in to_generate:
            print(f"room-{rtype}.png:")
            print(f"  {prompts[rtype][:200]}...")
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

    for i, rtype in enumerate(to_generate):
        prompt = prompts[rtype]
        print(f"\n[{i+1}/{len(to_generate)}] Generating room-{rtype}.png")
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
                output_path = os.path.join(OUTPUT_DIR, f"room-{rtype}.png")
                img_data = flatten_to_opaque(img_data, output_path)
                size_kb = len(img_data) / 1024
                print(f"  ✓ Saved room-{rtype}.png ({size_kb:.1f} KB)")
                success_count += 1
            else:
                print(f"  ✗ No image data returned for {rtype}")
                fail_count += 1

        except Exception as e:
            print(f"  ✗ Error generating {rtype}: {e}")
            fail_count += 1

    print(f"\n{'='*40}")
    print(f"Done: {success_count} generated, {fail_count} failed")


if __name__ == "__main__":
    main()
