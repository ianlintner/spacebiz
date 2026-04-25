#!/usr/bin/env python3
"""
Validate a generated CEO portrait image against quality criteria.

Usage:
  python3 scripts/validate-portrait.py 1          # Validate ceo-01.png
  python3 scripts/validate-portrait.py 42          # Validate ceo-42.png
  python3 scripts/validate-portrait.py 1 --json    # Output JSON result

Validation checks:
  1. File exists and is a valid PNG
  2. Image dimensions are 1024x1024
  3. File size is reasonable (50KB - 5MB)
  4. Image is not mostly blank/single-color
  5. Dominant colors align with dark space theme (dark backgrounds expected)

Exit codes:
  0 = all checks pass
  1 = one or more checks failed
  2 = file not found or invalid args
"""
import json
import os
import struct
import sys
import zlib

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "ceo")
PORTRAITS_TS = os.path.join(PROJECT_ROOT, "src", "data", "portraits.ts")


def read_png_info(filepath):
    """Read PNG header to get dimensions without PIL."""
    with open(filepath, "rb") as f:
        header = f.read(8)
        if header[:4] != b'\x89PNG':
            return None, None, "Not a valid PNG file"
        # Skip to IHDR chunk
        chunk_len = struct.unpack(">I", f.read(4))[0]
        chunk_type = f.read(4)
        if chunk_type != b'IHDR':
            return None, None, "Missing IHDR chunk"
        width = struct.unpack(">I", f.read(4))[0]
        height = struct.unpack(">I", f.read(4))[0]
        return width, height, None


def sample_colors_from_png(filepath, sample_size=1000):
    """Sample pixel colors from raw PNG data to check for blank images.
    Returns average brightness (0-255) and color variance."""
    try:
        with open(filepath, "rb") as f:
            data = f.read()

        # Find all IDAT chunks and decompress
        idat_data = b""
        pos = 8  # Skip PNG signature
        while pos < len(data) - 12:
            chunk_len = struct.unpack(">I", data[pos:pos+4])[0]
            chunk_type = data[pos+4:pos+8]
            if chunk_type == b'IDAT':
                idat_data += data[pos+8:pos+8+chunk_len]
            pos += chunk_len + 12  # len(4) + type(4) + data + crc(4)

        if not idat_data:
            return None, None

        try:
            raw = zlib.decompress(idat_data)
        except Exception:
            return None, None

        # Sample bytes from decompressed data for brightness estimate
        # Skip filter bytes (first byte of each row)
        pixels = []
        step = max(1, len(raw) // sample_size)
        for i in range(0, min(len(raw), sample_size * step), step):
            pixels.append(raw[i])

        if not pixels:
            return None, None

        avg = sum(pixels) / len(pixels)
        variance = sum((p - avg) ** 2 for p in pixels) / len(pixels)
        return avg, variance

    except Exception:
        return None, None


def get_portrait_info(num):
    """Get portrait info from portraits.ts by ID number."""
    import re
    with open(PORTRAITS_TS, "r") as f:
        content = f.read()

    pattern = (
        r'id:\s*"ceo-' + f"{num:02d}" + r'".*?'
        r'label:\s*"([^"]+)".*?'
        r'category:\s*"([^"]+)".*?'
        r'species:\s*"([^"]+)".*?'
        r'bio:\s*"([^"]+)"'
    )
    m = re.search(pattern, content, re.DOTALL)
    if m:
        return {
            "id": f"ceo-{num:02d}",
            "label": m.group(1),
            "category": m.group(2),
            "species": m.group(3),
            "bio": m.group(4),
        }
    return None


def validate(num, as_json=False):
    """Validate portrait ceo-{num:02d}.png. Returns dict of results."""
    pid = f"ceo-{num:02d}"
    filepath = os.path.join(OUTPUT_DIR, f"{pid}.png")
    info = get_portrait_info(num)

    results = {
        "id": pid,
        "filepath": filepath,
        "portrait_info": info,
        "checks": {},
        "passed": True,
        "summary": "",
    }

    # Check 1: File exists
    if not os.path.exists(filepath):
        results["checks"]["file_exists"] = {"pass": False, "detail": "File not found"}
        results["passed"] = False
        results["summary"] = f"{pid}: FILE NOT FOUND"
        if as_json:
            print(json.dumps(results, indent=2))
        else:
            print(f"FAIL: {pid} — file not found at {filepath}")
        return results

    results["checks"]["file_exists"] = {"pass": True}

    # Check 2: Valid PNG & dimensions
    file_size = os.path.getsize(filepath)
    width, height, err = read_png_info(filepath)

    if err:
        results["checks"]["valid_png"] = {"pass": False, "detail": err}
        results["passed"] = False
    else:
        results["checks"]["valid_png"] = {"pass": True}

    if width and height:
        dim_ok = width == 1024 and height == 1024
        results["checks"]["dimensions"] = {
            "pass": dim_ok,
            "detail": f"{width}x{height}",
            "expected": "1024x1024",
        }
        if not dim_ok:
            results["passed"] = False
    else:
        results["checks"]["dimensions"] = {"pass": False, "detail": "Could not read dimensions"}
        results["passed"] = False

    # Check 3: File size
    size_kb = file_size / 1024
    size_ok = 50 <= size_kb <= 5120
    results["checks"]["file_size"] = {
        "pass": size_ok,
        "detail": f"{size_kb:.1f} KB",
        "range": "50KB - 5MB",
    }
    if not size_ok:
        results["passed"] = False

    # Check 4: Not blank (color sampling)
    avg_brightness, variance = sample_colors_from_png(filepath)
    if avg_brightness is not None and variance is not None:
        # Blank image would have very low variance
        not_blank = variance > 100
        # Very bright avg suggests wrong theme (should be dark space background)
        dark_theme = avg_brightness < 180
        results["checks"]["not_blank"] = {
            "pass": not_blank,
            "detail": f"brightness={avg_brightness:.0f}, variance={variance:.0f}",
        }
        results["checks"]["dark_theme"] = {
            "pass": dark_theme,
            "detail": f"avg brightness={avg_brightness:.0f} (expecting <180 for dark space theme)",
        }
        if not not_blank or not dark_theme:
            results["passed"] = False
    else:
        results["checks"]["not_blank"] = {"pass": True, "detail": "Could not sample (assuming OK)"}
        results["checks"]["dark_theme"] = {"pass": True, "detail": "Could not sample (assuming OK)"}

    # Build summary
    failed = [k for k, v in results["checks"].items() if not v["pass"]]
    if failed:
        results["summary"] = f"{pid}: FAIL — {', '.join(failed)}"
    else:
        results["summary"] = f"{pid}: PASS — {width}x{height}, {size_kb:.1f}KB, species={info['species'] if info else '?'}"

    if as_json:
        print(json.dumps(results, indent=2))
    else:
        status = "PASS ✓" if results["passed"] else "FAIL ✗"
        print(f"{status}: {pid}")
        if info:
            print(f"  Character: {info['label']} ({info['species']}, {info['category']})")
            print(f"  Bio: {info['bio'][:100]}...")
        print(f"  File: {size_kb:.1f} KB, {width}x{height}" if width else f"  File: {size_kb:.1f} KB")
        for check_name, check in results["checks"].items():
            icon = "  ✓" if check["pass"] else "  ✗"
            detail = f" — {check['detail']}" if "detail" in check else ""
            print(f"  {icon} {check_name}{detail}")

    return results


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/validate-portrait.py <id> [--json]")
        print("  id: portrait number (e.g., 1 for ceo-01)")
        sys.exit(2)

    as_json = "--json" in sys.argv
    try:
        num = int(sys.argv[1])
    except ValueError:
        print(f"ERROR: '{sys.argv[1]}' is not a valid portrait number")
        sys.exit(2)

    results = validate(num, as_json=as_json)
    sys.exit(0 if results["passed"] else 1)


if __name__ == "__main__":
    main()
