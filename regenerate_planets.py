import os
import subprocess

output_dir = "/Users/ianlintner/Projects/spacebiz/public/portraits/planets"
os.makedirs(output_dir, exist_ok=True)

base_style = "viewed from space, entire planetary globe filling the center of the frame, cleanly separated from the dark space background, modern game art style, high contrast rim lighting, dark space background with stars, dramatic lighting, high quality"

prompts = {
    "agricultural": f"A verdant green planetary globe, a lush green agricultural world viewed from space, massive green continents and blue oceans, wispy white atmosphere, no closeups of farms, just the planet from space, {base_style}",
    "coreWorld": f"A densely populated glowing ecumenopolis planetary globe viewed from space, entire surface covered in city lights that look like a web of neon energy, orbital rings stretching around the planet, {base_style}",
    "frontier": f"A rugged frontier planetary globe viewed from space, vast dusty plains and rugged mountains visible from orbit, harsh untamed wilderness, atmospheric haze, {base_style}",
    "luxuryWorld": f"A stunning luxury resort planetary globe viewed from space, crystal clear azure oceans, bright pink bio-luminescent continental reefs, pastel atmospheric glow, {base_style}",
    "manufacturing": f"An industrial manufacturing planetary globe viewed from space, metal and machinery covering the planet crust, glowing orange furnace light from massive magma cracks and industry, thick smog covering the globe, no closeups of factories, {base_style}",
    "mining": f"A barren rocky mining planetary globe viewed from space, deep craters and glowing magma seams visible from orbit, dusty atmosphere, {base_style}",
    "techWorld": f"A high-tech research planetary globe viewed from space, surface dotted with glowing data grids and glowing blue energy, strange energy phenomena in the atmosphere, {base_style}"
}

env = os.environ.copy()

for p_type, prompt in prompts.items():
    print(f"Generating {p_type}...")
    output_path = os.path.join(output_dir, f"planet-{p_type}.png")
    cmd = [
        "python3", os.path.expanduser("~/Projects/ai-pixel-art-image-generation/scripts/generate_image.py"),
        "--prompt", prompt,
        "--size", "1024x1024",
        "--proof",
        "--proof",
        "--output", output_path
    ]
    subprocess.run(cmd, env=env, check=True)

print("Done submitting batch jobs for planets.")
