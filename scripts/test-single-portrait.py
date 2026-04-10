#!/usr/bin/env python3
"""
Generate a SINGLE test CEO portrait to QA the style prompt.
Run from project root: python3 scripts/test-single-portrait.py
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

# ── REFINED STYLE PROMPT ────────────────────────────────────────────────────
# Key changes from previous:
# - Explicit "NO text, NO words, NO letters, NO names" 
# - Stronger pixel art direction with specific palette/dithering cues
# - Reference dark-space-neon game UI aesthetic more precisely
# - Added "game avatar icon" framing

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

# Test with a human CEO AND an alien to see both
TEST_PROMPTS = [
    {
        "id": "test-human",
        "prompt": (
            "A weathered male human starship commander in his 50s with grey hair, "
            "cybernetic left eye glowing blue, wearing a dark officer's coat with gold epaulettes. "
            "Grizzled spacer veteran with confident expression. "
            + STYLE_BASE
        ),
    },
    {
        "id": "test-alien",
        "prompt": (
            "A mantis-like insectoid alien CEO with large compound emerald eyes, "
            "iridescent purple-black chitinous exoskeleton, sharp mandibles, "
            "wearing an ornate silk-like robe with gemstone clasps. "
            "Regal and intimidating alien merchant prince. "
            + STYLE_BASE
        ),
    },
]


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

    for test in TEST_PROMPTS:
        tid = test["id"]
        prompt = test["prompt"]
        print(f"\nGenerating {tid}...")
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
                output_path = os.path.join(OUTPUT_DIR, f"{tid}.png")
                with open(output_path, "wb") as f:
                    f.write(img_data)
                print(f"Saved {output_path} ({len(img_data)} bytes)")
            else:
                print(f"No b64 data for {tid}")

        except Exception as e:
            print(f"ERROR: {e}")

    print("\nDone! Check public/portraits/ceo/ for test-human.png and test-alien.png")


if __name__ == "__main__":
    main()
