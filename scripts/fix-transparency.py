#!/usr/bin/env python3
"""Batch-fix transparent portraits by compositing RGBA onto dark background."""
from PIL import Image
import os
import glob
import sys

BG_COLOR = (10, 10, 26)  # #0a0a1a
CEO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "public", "portraits", "ceo")

def main():
    fixed = 0
    checked = 0
    for path in sorted(glob.glob(os.path.join(CEO_DIR, "ceo-*.png"))):
        checked += 1
        img = Image.open(path)
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, BG_COLOR)
            bg.paste(img, mask=img.split()[3])
            bg.save(path, format="PNG")
            print(f"  Fixed: {os.path.basename(path)}")
            fixed += 1
    print(f"\nChecked {checked} files. Flattened {fixed} RGBA → RGB on #0a0a1a.")

if __name__ == "__main__":
    main()
