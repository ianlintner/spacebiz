#!/usr/bin/env python3
"""
Generate Rex K9 Corporate Adviser portrait images via MCP image-gen server.
Produces 4 mood variants: standby, analyzing, alert, success.
All same size (1024x1024), same style, same character - different expressions/lighting.
"""

import json
import os
import select
import subprocess
import sys
import time
from pathlib import Path

OUTPUT_DIR = Path("/Users/ianlintner/Projects/spacebiz/public/portraits/adviser")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Base character description (consistent across all moods)
BASE_DESC = (
    "Bust portrait of Rex, a cybernetically-enhanced Siberian Husky dog wearing a corporate suit. "
    "He is a K9 corporate adviser in a sci-fi space station setting. "
    "The husky has distinctive grey and white fur with the classic Siberian Husky face mask pattern, "
    "bright blue eyes with subtle cybernetic glow, a sleek headset with teal-glowing microphone, "
    "and a dark formal suit with gold piping lapel accents and a gold tie. "
    "Small teal cybernetic implant lines visible near ears and on suit collar. "
    "3/4 view portrait composition, dark space station backdrop with subtle purple-blue gradient, "
    "clean modern game art style with pixel-art influences, high contrast, "
    "teal and amber rim lighting. No text. PNG with transparent background."
)

# Mood-specific variations
MOODS = {
    "standby": {
        "suffix": "Calm, professional expression. Neutral relaxed ears. Headset glowing steady teal. "
                  "Cool ambient lighting. Slight friendly smile. Confident and approachable demeanor.",
        "filename": "rex-standby.png",
    },
    "analyzing": {
        "suffix": "Focused, concentrated expression. Slightly narrowed eyes scanning data. "
                  "Amber-orange glow on headset. Holographic data readout reflecting in eyes. "
                  "Ears slightly forward (attentive). Warm amber accent lighting. Thoughtful look.",
        "filename": "rex-analyzing.png",
    },
    "alert": {
        "suffix": "Alert, urgent expression. Wide eyes with slight red-orange glow. "
                  "Ears perked up high and forward. Red-orange warning glow on headset. "
                  "Tense jaw. Red accent rim lighting. Warning/danger mood. Intense gaze.",
        "filename": "rex-alert.png",
    },
    "success": {
        "suffix": "Happy, celebratory expression. Wide grin showing teeth (friendly dog smile). "
                  "Ears relaxed and slightly back. Gold sparkle effects. Headset glowing warm gold. "
                  "Golden accent lighting. Triumphant, joyful mood. Eyes bright and gleaming.",
        "filename": "rex-success.png",
    },
}

server_cmd = [
    "/bin/zsh",
    "-lc",
    "exec /Users/ianlintner/Projects/spacebiz/.mcp/image-gen-mcp/start-mcp.sh",
]


def start_server():
    return subprocess.Popen(
        server_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )


def send(proc, msg):
    body = json.dumps(msg).encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
    proc.stdin.write(header + body)
    proc.stdin.flush()


def read_exact(proc, n, timeout=120):
    buf = b""
    end = time.time() + timeout
    fd = proc.stdout.fileno()
    while len(buf) < n and time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.5)
        if not r:
            continue
        chunk = os.read(fd, n - len(buf))
        if not chunk:
            break
        buf += chunk
    return buf


def recv(proc, timeout=120):
    end = time.time() + timeout
    data = b""
    fd = proc.stdout.fileno()

    while b"\r\n\r\n" not in data and time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.5)
        if not r:
            continue
        chunk = os.read(fd, 1)
        if not chunk:
            break
        data += chunk

    if b"\r\n\r\n" not in data:
        return None

    header_bytes, rest = data.split(b"\r\n\r\n", 1)
    headers = {}
    for line in header_bytes.decode("ascii", "replace").split("\r\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()

    if "content-length" not in headers:
        return None

    n = int(headers["content-length"])
    body = rest
    if len(body) < n:
        body += read_exact(proc, n - len(body), timeout=timeout)

    if len(body) < n:
        return None

    return json.loads(body[:n].decode("utf-8", "replace"))


def generate_portrait(proc, mood_key, mood_info, req_id):
    prompt = f"{BASE_DESC} {mood_info['suffix']}"
    out_path = OUTPUT_DIR / mood_info["filename"]

    print(f"\n{'='*60}")
    print(f"Generating: {mood_key} → {out_path.name}")
    print(f"{'='*60}")

    send(
        proc,
        {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": "generate_image",
                "arguments": {
                    "prompt": prompt,
                    "size": "1024x1024",
                    "quality": "high",
                    "style": "vivid",
                    "output_format": "png",
                    "background": "transparent",
                },
            },
        },
    )

    gen_resp = recv(proc, timeout=180)
    if not gen_resp or "result" not in gen_resp:
        print(f"  ✗ Failed to generate {mood_key}")
        return False

    # Extract image URL from response
    payload = None
    content = gen_resp.get("result", {}).get("content")
    if isinstance(content, list) and content:
        text_items = [
            c.get("text")
            for c in content
            if isinstance(c, dict) and c.get("type") == "text"
        ]
        if text_items:
            try:
                payload = json.loads(text_items[0])
            except Exception:
                payload = {"raw_text": text_items[0]}

    if payload is None:
        payload = gen_resp.get("result", {})

    image_url = payload.get("image_url") if isinstance(payload, dict) else None

    if image_url and image_url.startswith("file://"):
        src = Path(image_url.replace("file://", ""))
        if src.exists():
            out_path.write_bytes(src.read_bytes())
            print(f"  ✓ Saved: {out_path}")
            return True
        else:
            print(f"  ✗ File URL not found: {src}")
            return False
    else:
        print(f"  ✗ No file URL returned for {mood_key}")
        print(f"    Payload: {json.dumps(payload, indent=2)[:500]}")
        return False


def main():
    print("Starting MCP image-gen server...")
    proc = start_server()

    results = {}

    try:
        # Initialize
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "rex-portrait-gen", "version": "1.0.0"},
                },
            },
        )
        init_resp = recv(proc, timeout=20)
        if not init_resp or "result" not in init_resp:
            print("✗ Failed to initialize MCP server")
            sys.exit(1)
        print("✓ MCP server initialized")

        send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

        # Generate each mood portrait
        req_id = 10
        for mood_key, mood_info in MOODS.items():
            ok = generate_portrait(proc, mood_key, mood_info, req_id)
            results[mood_key] = ok
            req_id += 1

    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

    # Summary
    print(f"\n{'='*60}")
    print("GENERATION SUMMARY")
    print(f"{'='*60}")
    for mood_key, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {mood_key}: {MOODS[mood_key]['filename']}")

    generated = [f for f in OUTPUT_DIR.iterdir() if f.suffix == ".png"]
    print(f"\nTotal files in {OUTPUT_DIR}: {len(generated)}")

    return all(results.values())


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
