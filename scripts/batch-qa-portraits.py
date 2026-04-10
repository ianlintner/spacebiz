#!/usr/bin/env python3
"""
Batch QA: Generate 5 diverse portraits from the actual portrait registry to validate
the prompt produces consistent, high-quality results across species types.

Run from project root: python3 scripts/batch-qa-portraits.py
"""
import base64
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "ceo")

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

# ── REFINED STYLE PROMPT (validated in test-single-portrait.py) ─────────────
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

# Species-specific visual descriptions — pushed weird/abstract for exotic species
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

# ── 5 weird/abstract alien portraits for QA ─────────────────────────────────
# Chosen to stress-test exotic species: Energy, Ethereal, Mechanical, Shapeshifter, Amoeboid
BATCH = [
    {
        "id": "ceo-86",
        "label": "Aethon Flux",
        "species": "Energy",
        "bio": "Sentient plasma field confined in a magnetic bottle. Thinks in waveforms and invests in particle accelerators.",
    },
    {
        "id": "ceo-87",
        "label": "Lumis Veil",
        "species": "Ethereal",
        "bio": "Light-being that exists partially in hyperspace. Sees trade routes as luminous threads connecting stars.",
    },
    {
        "id": "ceo-95",
        "label": "Forge Symbiont",
        "species": "Mechanical",
        "bio": "Organic-machine hybrid species that grows circuitry like coral. Self-upgrading, self-replicating, self-employed.",
    },
    {
        "id": "ceo-98",
        "label": "Flux Mimare",
        "species": "Shapeshifter",
        "bio": "Morphic entity that physically becomes whoever it negotiates with. Unsettling, but undeniably effective.",
    },
    {
        "id": "ceo-97",
        "label": "Glob Nexus",
        "species": "Amoeboid",
        "bio": "Gelatinous mass that absorbs cultural artifacts to understand clients. Wore a top hat once and never took it off.",
    },
]


def build_prompt(entry):
    species = entry["species"]
    species_visual = SPECIES_VISUALS.get(species, "alien creature with unique features")
    bio_short = entry["bio"][:120]

    return (
        f"{species_visual}. "
        f"{bio_short}. "
        f"{STYLE_BASE}"
    )


def main():
    try:
        import openai
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
        import openai

    api_key = env.get("PROVIDERS__OPENAI__API_KEY", env.get("OPENAI_API_KEY", ""))
    if not api_key:
        print("ERROR: No OpenAI API key found")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key)

    for i, entry in enumerate(BATCH):
        pid = entry["id"]
        prompt = build_prompt(entry)
        print(f"\n[{i+1}/{len(BATCH)}] Generating {pid} — {entry['label']} ({entry['species']})")
        print(f"Prompt ({len(prompt)} chars):\n{prompt}\n")

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
                print(f"Saved {output_path} ({len(img_data)} bytes)")
            else:
                print(f"No b64 data for {pid}")

        except Exception as e:
            print(f"ERROR generating {pid}: {e}")
            continue

    print(f"\nBatch QA complete! Generated {len(BATCH)} portraits in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
