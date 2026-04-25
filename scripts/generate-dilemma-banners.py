#!/usr/bin/env python3
"""
Generate the 10 dilemma banner illustrations for spacebiz via Azure
gpt-image-2 + a Pillow downscale to 480x240 (game-friendly size).

Each banner is generated at 1536x1024, then downscaled with nearest-neighbor
interpolation to keep pixel-art crispness, then color-quantized to 64 colors
for visual cohesion with the existing portrait/ship asset palette.

Run:  python3 scripts/generate-dilemma-banners.py [--only id1,id2,...]
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
import time
from pathlib import Path

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI
from PIL import Image
from io import BytesIO

# Common style fragment shared across all banners — keeps visual cohesion.
STYLE = (
    "wide cinematic banner illustration, painterly pixel-art style, "
    "high-detail sci-fi industrial scene, dramatic lighting with neon accents "
    "of cyan and amber on dark backgrounds, no text, no watermark, no UI, "
    "no logos, no characters facing camera directly, evocative mood like "
    "a Paradox grand strategy event card or Total War: Warhammer event"
)

PROMPTS: dict[str, str] = {
    "dilemma_engineer_strike": (
        "A cluttered orbital shipyard catwalk filled with frustrated "
        "engineers in coveralls holding tools and protest placards, mech "
        "arms idle in the background, sparks dim, factory lights hot. "
        + STYLE
    ),
    "dilemma_tariff_brinkmanship": (
        "A grand alien-empire diplomatic hall, towering ribbed columns, a "
        "long marble negotiation table with ledgers and trade contracts "
        "spread across it, a holographic tariff chart hovering above, "
        "robed officials in shadow on either side. " + STYLE
    ),
    "dilemma_credit_squeeze": (
        "An austere bank boardroom in a space station, glass walls "
        "overlooking deep space, a long obsidian desk strewn with "
        "financial holo-displays showing falling charts, severe banker "
        "silhouettes in the background. " + STYLE
    ),
    "dilemma_rival_recruits": (
        "A noisy crew lounge in a starport — uniformed haulers and pilots "
        "huddled around a holo-table, a rival recruiter in a sharp suit "
        "leaning over with a contract, dim neon bar signs in the back. "
        + STYLE
    ),
    "dilemma_retrofit_offer": (
        "A massive cargo freighter in dry dock surrounded by scaffolding "
        "and robotic welder arms, sparks flying, blueprints projected on "
        "transparent panels, technicians in exoskeletons at the base. "
        + STYLE
    ),
    "dilemma_quarantine_outbreak": (
        "A space-station concourse in lockdown, hazmat-suited responders "
        "setting up biocontainment barriers, holographic 'QUARANTINE' "
        "warning lights pulsing magenta, civilians watching from inside "
        "transparent partitions, sterile blue-white interior light. "
        + STYLE
    ),
    "dilemma_corporate_espionage": (
        "A dimly lit sky-bar booth on a station, a cloaked defector "
        "sliding a glowing data-cube across a glass table to an "
        "unseen counterpart, holographic R&D schematics projected above "
        "the cube, neon city lights blurred outside the floor-to-ceiling "
        "window. " + STYLE
    ),
    "dilemma_bandit_warlord_offer": (
        "A scarred warlord's flagship docking with a player freighter at "
        "an asteroid waystation, mismatched armed guards with rifles at "
        "ease near the airlock, a cargo-pallet of tribute crates lit by "
        "harsh red docking lights, asteroid silhouette behind. " + STYLE
    ),
    "dilemma_data_breach": (
        "A glassy corporate analyst office at night, a single executive "
        "silhouetted in front of a wall of cascading data leak feeds, "
        "warning klaxons reflected on chrome surfaces, holographic "
        "redacted documents fluttering through the air, deep red alert "
        "tint. " + STYLE
    ),
    "dilemma_legacy_freighter": (
        "An enormous derelict mega-hauler floating in a debris field, "
        "hull pitted and dust-streaked, salvage drones lighting one panel "
        "as a tiny inspection shuttle approaches the hangar bay. Massive "
        "scale, atmospheric, melancholic, asteroid-belt lighting. "
        + STYLE
    ),
}


def make_client(endpoint: str) -> AzureOpenAI:
    """Use az login (DefaultAzureCredential) for auth."""
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(),
        "https://cognitiveservices.azure.com/.default",
    )
    return AzureOpenAI(
        azure_endpoint=endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2025-04-01-preview",
    )


def generate_one(
    client: AzureOpenAI,
    prompt: str,
    deployment: str,
    size: str = "1536x1024",
    quality: str = "medium",
) -> bytes:
    resp = client.images.generate(
        model=deployment,
        prompt=prompt,
        size=size,
        quality=quality,
        n=1,
    )
    b64 = resp.data[0].b64_json
    if b64 is None:
        raise RuntimeError("Image response missing b64_json")
    return base64.b64decode(b64)


def downscale_pixel_art(
    raw: bytes, target_w: int = 480, target_h: int = 240, palette_colors: int = 64
) -> bytes:
    """Pillow downscale + palette quantize for cohesion with existing assets."""
    img = Image.open(BytesIO(raw)).convert("RGB")
    # Crop top half (banners are wide; image is 3:2). Centre-crop 3:2 → 2:1.
    w, h = img.size
    target_aspect = target_w / target_h  # 2.0
    src_aspect = w / h
    if src_aspect > target_aspect:
        # too wide, crop horizontally
        new_w = int(h * target_aspect)
        x0 = (w - new_w) // 2
        img = img.crop((x0, 0, x0 + new_w, h))
    else:
        # too tall, crop vertically
        new_h = int(w / target_aspect)
        y0 = (h - new_h) // 2
        img = img.crop((0, y0, w, y0 + new_h))
    # Step-down to target via Lanczos (smoother than NN at banner scale)
    img = img.resize((target_w, target_h), Image.LANCZOS)
    # Palette quantize for visual cohesion
    img = img.quantize(colors=palette_colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).convert("RGB")
    out = BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", default=os.environ.get("AZURE_OPENAI_ENDPOINT") or "https://lintnerian-7181-resource.openai.azure.com/")
    parser.add_argument("--deployment", default="gpt-image-2")
    parser.add_argument("--quality", default="medium", choices=["low", "medium", "high"])
    parser.add_argument("--out-dir", default="public/dilemmas")
    parser.add_argument("--only", default=None, help="Comma-separated subset of dilemma keys")
    parser.add_argument("--retry-delay", type=int, default=65, help="Seconds to wait on 429")
    parser.add_argument("--max-retries", type=int, default=3)
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    keys = list(PROMPTS.keys())
    if args.only:
        wanted = {k.strip() for k in args.only.split(",") if k.strip()}
        keys = [k for k in keys if k in wanted]
        if not keys:
            print(f"No prompts match --only={args.only}", file=sys.stderr)
            return 2

    client = make_client(args.endpoint)

    print(f"Generating {len(keys)} banners → {out_dir} (deployment={args.deployment}, quality={args.quality})")
    failures: list[str] = []

    for i, key in enumerate(keys, start=1):
        out_path = out_dir / f"{key}.png"
        if out_path.exists():
            print(f"[{i}/{len(keys)}] {key}: already exists, skipping")
            continue

        prompt = PROMPTS[key]
        attempts = 0
        while True:
            attempts += 1
            try:
                print(f"[{i}/{len(keys)}] {key}: generating (attempt {attempts})…")
                raw = generate_one(client, prompt, args.deployment, quality=args.quality)
                processed = downscale_pixel_art(raw)
                out_path.write_bytes(processed)
                print(f"           wrote {out_path} ({len(processed)//1024} KB)")
                break
            except Exception as e:
                msg = str(e)
                rate_limited = ("429" in msg) or ("rate limit" in msg.lower())
                if rate_limited and attempts <= args.max_retries:
                    print(f"           rate-limited, sleeping {args.retry_delay}s…", file=sys.stderr)
                    time.sleep(args.retry_delay)
                    continue
                print(f"           FAILED: {msg}", file=sys.stderr)
                failures.append(key)
                break

    if failures:
        print(f"\nFailed: {failures}", file=sys.stderr)
        return 1
    print("\nAll banners generated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
