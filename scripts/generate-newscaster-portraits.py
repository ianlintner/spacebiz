#!/usr/bin/env python3
"""
Generate GNN newscaster character portraits for Star Freight Tycoon.
Produces 5 newscaster types: anchor, science, finance, fashion, field.

Uses direct OpenAI gpt-image-2 API (falls back to gpt-image-1).
Reads IMAGE_GEN_OPEN_API_KEY env var first, then .mcp/.env fallback.
Output: assets-source/portraits/newscaster/<name>.png (flattened to #0a0a1a bg)
"""

import base64
import io
import os
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "assets-source" / "portraits" / "newscaster"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_api_key():
    env_file = PROJECT_ROOT / ".mcp" / "image-gen-mcp" / ".env"
    env = os.environ.copy()
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    # Check IMAGE_GEN_OPEN_API_KEY first (dedicated image-gen key)
    return env.get(
        "IMAGE_GEN_OPEN_API_KEY",
        env.get("PROVIDERS__OPENAI__API_KEY", env.get("OPENAI_API_KEY", "")),
    )


BG_COLOR = (10, 10, 26)  # #0a0a1a — matches game theme


def flatten_to_opaque(img_bytes, output_path):
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


# Same STYLE_BASE as generate-portraits.py (MOO2 / Star Control retro pixel art)
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

NEWSCASTERS = {
    "anchor": {
        "desc": (
            "Stellara Vex, lead news anchor alien for the Galactic News Network. "
            "Humanoid alien with smooth cobalt-blue iridescent skin, slightly elongated graceful head, "
            "large almond-shaped silver eyes with bioluminescent glow, silver-white swept hair. "
            "Crisp navy double-breasted suit with gold GNN lapel pin, holographic earpiece. "
            "Professional, authoritative expression. Studio spotlight backdrop."
        ),
        "filename": "anchor.png",
    },
    "anchor-b": {
        "desc": (
            "Vaxis Morn, senior GNN correspondent and alternate anchor. "
            "Dignified bipedal reptilian alien with silver-scaled skin, a broad flat head, "
            "deep amber vertical-slit eyes, subtle neck frill folded neatly. "
            "Immaculate dark grey formal robes with silver piping, small GNN broadcast pin. "
            "Calm, measured expression. Warm studio backdrop with soft diffuse lighting."
        ),
        "filename": "anchor-b.png",
    },
    "anchor-c": {
        "desc": (
            "The Presence, enigmatic GNN omnibus anchor. "
            "A floating semi-translucent energy being, vaguely humanoid silhouette composed of soft "
            "glowing plasma in lime-green and ivory white, internal luminous core visible, "
            "wispy tendrils of light framing the face area. No solid body — pure radiant energy. "
            "Wears a minimalist dark anchor-desk jacket phased into the energy form. "
            "Serene, all-knowing expression. Deep black studio void backdrop with subtle star motes."
        ),
        "filename": "anchor-c.png",
    },
    "anchor-d": {
        "desc": (
            "Crixx Velaan, GNN night desk anchor. "
            "Insectoid alien with a sleek chitinous head, large multifaceted compound eyes in deep violet, "
            "thin mandibles folded neatly, smooth carapace with iridescent black sheen. "
            "Sharp fitted blazer in charcoal with metallic accents, crisp news-anchor composure. "
            "Alert, precise expression. Dark studio with cool blue and purple lighting."
        ),
        "filename": "anchor-d.png",
    },
    "science": {
        "desc": (
            "Dr. Krill Vexx, science and technology correspondent. "
            "Small classic grey alien with large smooth grey head, huge glossy black almond eyes, "
            "tiny slit nostrils, intellectually curious expression. "
            "White lab coat over turtleneck, small circular wire-rimmed spectacles. "
            "Datapad hologram visible. Teal-green science-desk backdrop."
        ),
        "filename": "science.png",
    },
    "finance": {
        "desc": (
            "Sterling Hawkes, markets analyst for GNN. "
            "Exotic bird alien with vibrant tropical plumage in electric blues and golds, "
            "sleek swept-back feather-crest, sharp raptor eyes, confident cocky grin. "
            "Pinstriped power suit with red suspenders and pocket square, gold tie clip. "
            "80s Wall Street energy. Holographic stock chart visible."
        ),
        "filename": "finance.png",
    },
    "fashion": {
        "desc": (
            "CHIC-9, style and culture correspondent for GNN. "
            "Sleek chrome humanoid robot with elegant elongated frame, "
            "large compound optical sensors arranged like dramatic eye makeup, "
            "articulated joints with couture-style plating. "
            "Chic structured jacket with chrome details. Dramatic pose. "
            "Neon-pink and violet studio lighting backdrop."
        ),
        "filename": "fashion.png",
    },
    "field": {
        "desc": (
            "Grix Vander, field reporter for GNN. "
            "Rugged bipedal lizard alien with green-grey scales, bright amber slit-pupil eyes, "
            "athletic build, slightly wind-blown head frills. "
            "Worn tactical field vest with logo patches, directional microphone. "
            "Outdoor colony backdrop with dramatic sky. Slightly disheveled but focused."
        ),
        "filename": "field.png",
    },
    "weather": {
        "desc": (
            "Syx-7 Vermis, GNN space weather and crisis reporter. "
            "Highly alien cephalopod-like creature: bulbous translucent cranium housing a visible "
            "pulsing brain, ring of six independent unblinking eyes around the head in amber and red, "
            "short writhing sensory tendrils below the face, mottled dark purple and charcoal skin. "
            "Wears a high-collared emergency-broadcast jacket with storm-alert insignia. "
            "Intense, slightly unnerving expression. Backdrop of swirling nebula storm and warning hues."
        ),
        "filename": "weather.png",
    },
    "paparazzi": {
        "desc": (
            "Blix Snarr, GNN entertainment and pop culture correspondent. "
            "Flashy insectoid alien: iridescent chitinous face with glittering faceted eyes in magenta, "
            "razor-thin antenna swept back stylishly, wide toothy grin, exuberant energy. "
            "Wears a gaudy sequined blazer in gold and hot pink, multiple press credentials hanging. "
            "Holds a holographic press-camera in one of four thin arms. "
            "Charismatic, larger-than-life expression. Glittering paparazzi backdrop with starburst lights."
        ),
        "filename": "paparazzi.png",
    },
    "sports": {
        "desc": (
            "Krag Ironstone, GNN sports desk anchor. "
            "Massive silicate rock alien: thick craggy stone-textured body, broad flat face with deep-set "
            "glowing lava-orange eyes, wide jaw with granite-like ridges, enormously wide shoulders. "
            "Visibly crammed into an ill-fitting but expensive sports-anchor suit — jacket straining at "
            "the seams, tie slightly crooked, too-small collar. Looks like an NFL linebacker forced into "
            "broadcast TV. Enthusiastic, booming expression. Sports broadcast backdrop with score tickers."
        ),
        "filename": "sports.png",
    },
    "investigator": {
        "desc": (
            "Mira Tendrax, GNN investigative correspondent. "
            "Elegant cephalopod-humanoid alien: smooth slate-grey domed head, four slender manipulator "
            "tentacles visible at the sides, large luminous teal eyes with horizontal pupils, "
            "composed but intense expression suggesting deep suspicion. "
            "Sharp structured blazer in dark charcoal with subtle pinstripe, press badge on lapel. "
            "Holds a datapad with holographic dossier. Dark investigative-desk backdrop, dramatic side light."
        ),
        "filename": "investigator.png",
    },
    "explorer": {
        "desc": (
            "Prof. Lumis Thane, GNN deep space and xenobiology correspondent. "
            "Bioluminescent semi-translucent alien: soft jellyfish-like form with a distinct domed head, "
            "large gentle deep-blue eyes, glowing bio-patterns of aqua and violet tracing the skin, "
            "trailing gossamer fronds framing the head and shoulders. Otherworldly but approachable. "
            "Wears a lightweight expedition field coat with xenobiology insignia and sample vials. "
            "Curious, wonder-filled expression. Backdrop of alien flora and deep-space survey imagery."
        ),
        "filename": "explorer.png",
    },
    "newscaster-anomaly": {
        "desc": (
            "Zix Anomura, GNN anomaly and unexplained phenomena correspondent. "
            "alien xenobiologist field reporter, glowing teal eyes, deep-space science divination aesthetic, "
            "cybernetic monocle, pixel-art portrait"
        ),
        "filename": "newscaster-anomaly.png",
    },
    "newscaster-music": {
        "desc": (
            "Lyra Cass, GNN music and culture correspondent. "
            "vibrant alien music critic, holographic earrings, magenta fur trim, stylish pixel-art portrait"
        ),
        "filename": "newscaster-music.png",
    },
    "newscaster-discovery": {
        "desc": (
            "Dr. Venn Orix, GNN discovery and exploration correspondent. "
            "weathered explorer-academic alien, dust-coated coat, telescope strap, weathered eyes, pixel-art portrait"
        ),
        "filename": "newscaster-discovery.png",
    },
    "newscaster-gossip": {
        "desc": (
            "Sable Drenn, GNN gossip and society correspondent. "
            "glamorous alien socialite gossip columnist, amber lipstick, dramatic eye-shadow, voidlight earrings, pixel-art portrait"
        ),
        "filename": "newscaster-gossip.png",
    },
    "newscaster-military": {
        "desc": (
            "Cmdr. Harke Voss, GNN military and defense correspondent. "
            "stern alien military officer with neural-link scar, bloodred eye, formal uniform, pixel-art portrait"
        ),
        "filename": "newscaster-military.png",
    },
    "newscaster-propaganda": {
        "desc": (
            "The Archivist, GNN state affairs and official broadcast correspondent. "
            "silhouette only, no visible face, steel-grey shroud, abstract lighting, pixel-art portrait"
        ),
        "filename": "newscaster-propaganda.png",
    },
}


def main():
    try:
        import openai
    except ImportError:
        import subprocess
        print("Installing openai package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
        import openai

    api_key = load_api_key()
    if not api_key:
        print("ERROR: No OpenAI API key found (IMAGE_GEN_OPEN_API_KEY / OPENAI_API_KEY)")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key)

    # Try gpt-image-2 first; fall back to gpt-image-1 if unavailable
    model = "gpt-image-2"
    try:
        test = client.images.generate(model=model, prompt="test pixel dot", n=1, size="1024x1024", quality="low")
        if not (test.data and test.data[0].b64_json):
            raise ValueError("no data")
        print(f"  ✓ Model confirmed: {model}")
    except Exception as e:
        if "model" in str(e).lower() or "deployment" in str(e).lower() or "not found" in str(e).lower():
            model = "gpt-image-1"
            print(f"  gpt-image-2 unavailable ({e}), falling back to gpt-image-1")
        else:
            print(f"  Using {model} (probe error: {e})")

    results = {}

    items = list(NEWSCASTERS.items())
    for i, (key, info) in enumerate(items):
        out_path = OUTPUT_DIR / info["filename"]
        if out_path.exists():
            print(f"[{i+1}/{len(items)}] Skipping {key} — already exists")
            results[key] = True
            continue

        prompt = f"{info['desc']} {STYLE_BASE}"
        print(f"\n{'='*60}")
        print(f"[{i+1}/{len(items)}] Generating: {key} → {info['filename']} [{model}]")
        print(f"{'='*60}")

        try:
            result = client.images.generate(
                model=model,
                prompt=prompt,
                n=1,
                size="1024x1024",
                quality="medium",
            )

            if result.data and result.data[0].b64_json:
                img_data = base64.b64decode(result.data[0].b64_json)
                img_data = flatten_to_opaque(img_data, str(out_path))
                size_kb = len(img_data) / 1024
                print(f"  ✓ Saved {info['filename']} ({size_kb:.1f} KB)")
                results[key] = True
            else:
                print(f"  ✗ No image data returned for {key}")
                results[key] = False

        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            results[key] = False
            if "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 30s...")
                time.sleep(30)
            continue

        if i < len(items) - 1:
            time.sleep(1.5)

    print(f"\n{'='*60}")
    print("GENERATION SUMMARY")
    print(f"{'='*60}")
    for key, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {key}: {NEWSCASTERS[key]['filename']}")

    generated = [f for f in OUTPUT_DIR.iterdir() if f.suffix == ".png"]
    print(f"\nTotal files in {OUTPUT_DIR}: {len(generated)}")
    return all(results.values())


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
