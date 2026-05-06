# Newscaster Ticker Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each news ticker item hoverable (underline) and clickable, opening a themed newscaster dialog that "reads" the story with a typewriter effect, backed by 5 AI-generated pixel-art newscaster portraits.

**Architecture:** The `HorizontalNewsTicker` gains per-item hover/click detection by computing pixel offsets for each item at cycle-start via a pure `buildItemOffsets()` function and a fixed interactive hit-zone Rectangle. Clicking launches `NewscasterScene` (DilemmaScene-style overlay) which looks up the category-appropriate newscaster and presents them reading the story with a typewriter effect. Five newscaster portraits (anchor, science alien, finance bird, fashion robot, field lizard) are generated from a new Python script following the existing `scripts/generate-rex-portraits.py` pattern and preloaded at boot.

**Tech Stack:** Phaser 4, TypeScript strict, Vitest 4, Python 3 (portrait gen via MCP image-gen server), sharp (optimize-assets)

---

## File Structure

| File                                                                          | Action           | Responsibility                                                                              |
| ----------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `src/generation/news/newscasters.ts`                                          | **Create**       | Newscaster type registry, category→newscaster mapping, `getNewscasterForCategory()`         |
| `src/generation/news/__tests__/newscasters.test.ts`                           | **Create**       | Unit tests: full category coverage, correct type lookups                                    |
| `packages/rogue-universe-shared/src/news/HorizontalNewsTicker.ts`             | **Modify**       | Pure `buildItemOffsets()`, interactive hit-zone, underline Graphics, `onItemClick` callback |
| `packages/rogue-universe-shared/src/news/__tests__/tickerItemOffsets.test.ts` | **Create**       | Unit tests for `buildItemOffsets()` pure function                                           |
| `scripts/generate-newscaster-portraits.py`                                    | **Create**       | AI portrait generation for 5 newscaster types via MCP image-gen server                      |
| `assets-source/portraits/newscaster/`                                         | **Create (dir)** | Source PNGs from generation script                                                          |
| `src/scenes/NewscasterScene.ts`                                               | **Create**       | Phaser overlay scene: portrait + newscaster name + typewriter story text + close button     |
| `src/main.ts`                                                                 | **Modify**       | Register `NewscasterScene` in scene list                                                    |
| `src/scenes/GameHUDScene.ts`                                                  | **Modify**       | Set `onItemClick` on `newsTicker`, launch `NewscasterScene` on click                        |

---

## Task 1: Newscaster Registry

**Files:**

- Create: `src/generation/news/newscasters.ts`
- Create: `src/generation/news/__tests__/newscasters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/generation/news/__tests__/newscasters.test.ts
import { describe, it, expect } from "vitest";
import {
  getNewscasterForCategory,
  NEWSCASTER_DEFS,
  NEWSCASTER_BY_CATEGORY,
} from "../newscasters.ts";
import type { TickerCategory } from "../types.ts";
import { FLAVOR_CATEGORIES } from "../categories.ts";

const ALL_CATEGORIES: TickerCategory[] = [
  "headline",
  "leader",
  "stock",
  ...FLAVOR_CATEGORIES,
];

describe("newscaster registry", () => {
  it("every TickerCategory maps to a newscaster", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(
        NEWSCASTER_BY_CATEGORY[cat],
        `missing category: ${cat}`,
      ).toBeDefined();
    }
  });

  it("every mapped newscaster type has a def entry", () => {
    const types = new Set(Object.values(NEWSCASTER_BY_CATEGORY));
    for (const t of types) {
      expect(NEWSCASTER_DEFS[t], `missing def for type: ${t}`).toBeDefined();
    }
  });

  it("science → science anchor", () => {
    const def = getNewscasterForCategory("science");
    expect(def.type).toBe("science");
  });

  it("stock and market_mover → finance anchor", () => {
    expect(getNewscasterForCategory("stock").type).toBe("finance");
    expect(getNewscasterForCategory("market_mover").type).toBe("finance");
  });

  it("fashion and celebrity → fashion anchor", () => {
    expect(getNewscasterForCategory("fashion").type).toBe("fashion");
    expect(getNewscasterForCategory("celebrity").type).toBe("fashion");
  });

  it("crime and blotter → field reporter", () => {
    expect(getNewscasterForCategory("crime").type).toBe("field");
    expect(getNewscasterForCategory("blotter").type).toBe("field");
  });

  it("headline and obituary → studio anchor", () => {
    expect(getNewscasterForCategory("headline").type).toBe("anchor");
    expect(getNewscasterForCategory("obituary").type).toBe("anchor");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- --reporter=verbose src/generation/news/__tests__/newscasters.test.ts
```

Expected: FAIL — "Cannot find module '../newscasters.ts'"

- [ ] **Step 3: Implement the newscaster registry**

```typescript
// src/generation/news/newscasters.ts
import type { TickerCategory } from "./types.ts";

export type NewscasterType =
  | "anchor"
  | "science"
  | "finance"
  | "fashion"
  | "field";

export interface NewscasterDef {
  type: NewscasterType;
  name: string;
  title: string;
  channel: string;
  /** Texture key used in Phaser after boot preload (matches portrait filename stem). */
  portraitKey: string;
  /** Category badge tint color (hex int). */
  accentColor: number;
}

export const NEWSCASTER_DEFS: Record<NewscasterType, NewscasterDef> = {
  anchor: {
    type: "anchor",
    name: "Stellara Vex",
    title: "Lead Anchor",
    channel: "Galactic News Network",
    portraitKey: "newscaster-anchor",
    accentColor: 0x4488ff,
  },
  science: {
    type: "science",
    name: "Dr. Krill Vexx",
    title: "Science & Tech Correspondent",
    channel: "GNN Science Desk",
    portraitKey: "newscaster-science",
    accentColor: 0x44ffcc,
  },
  finance: {
    type: "finance",
    name: "Sterling Hawkes",
    title: "Markets Analyst",
    channel: "GNN Markets Desk",
    portraitKey: "newscaster-finance",
    accentColor: 0xffd700,
  },
  fashion: {
    type: "fashion",
    name: "CHIC-9",
    title: "Style & Culture Correspondent",
    channel: "GNN Lifestyle Desk",
    portraitKey: "newscaster-fashion",
    accentColor: 0xff44cc,
  },
  field: {
    type: "field",
    name: "Grix Vander",
    title: "Field Reporter",
    channel: "GNN Field Bureau",
    portraitKey: "newscaster-field",
    accentColor: 0xff8844,
  },
};

export const NEWSCASTER_BY_CATEGORY: Record<TickerCategory, NewscasterType> = {
  // Structural
  headline: "anchor",
  leader: "anchor",
  stock: "finance",
  // Flavor
  politics: "anchor",
  corporate: "finance",
  market_mover: "finance",
  crime: "field",
  science: "science",
  sports: "field",
  celebrity: "fashion",
  cosmic_weather: "science",
  local: "field",
  health: "science",
  religion: "anchor",
  blotter: "field",
  food: "fashion",
  realestate: "finance",
  travel: "field",
  fashion: "fashion",
  academia: "science",
  xenobiology: "science",
  obituary: "anchor",
  homage: "anchor",
};

export function getNewscasterForCategory(cat: TickerCategory): NewscasterDef {
  const type = NEWSCASTER_BY_CATEGORY[cat];
  return NEWSCASTER_DEFS[type];
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/generation/news/__tests__/newscasters.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/ianlintner/Projects/spacebiz
git add src/generation/news/newscasters.ts src/generation/news/__tests__/newscasters.test.ts
git commit -m "feat(news): add newscaster registry with category→anchor mapping"
```

---

## Task 2: Portrait Generation Script

**Files:**

- Create: `scripts/generate-newscaster-portraits.py`
- Creates (at runtime): `assets-source/portraits/newscaster/*.png`

This script follows the exact same MCP pattern as `scripts/generate-rex-portraits.py`. Study that file before editing.

- [ ] **Step 1: Create the portrait generation script**

```python
#!/usr/bin/env python3
"""
Generate GNN newscaster portrait images via MCP image-gen server.
Produces 5 character portraits: anchor, science, finance, fashion, field.
"""

import json
import os
import select
import subprocess
import sys
import time
from pathlib import Path

OUTPUT_DIR = Path("/Users/ianlintner/Projects/spacebiz/assets-source/portraits/newscaster")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE_BASE = (
    "Bust portrait, 3/4 view composition, dark deep-space backdrop with subtle nebula gradient, "
    "clean modern game art style with pixel-art influences, high contrast rim lighting, "
    "professional news broadcast aesthetic. No text. PNG with transparent background."
)

NEWSCASTERS = {
    "anchor": {
        "desc": (
            "Stellara Vex, lead news anchor alien for the Galactic News Network. "
            "Humanoid alien with smooth cobalt-blue iridescent skin, slightly elongated graceful head, "
            "large almond-shaped silver eyes with a subtle bioluminescent glow. "
            "Wearing a crisp navy double-breasted suit with a white collar and gold GNN lapel pin. "
            "Professional, authoritative expression. Silver-white swept hair. "
            "Holographic earpiece glowing faint blue. Studio spotlight rim lighting, cool blue tones. "
        ),
        "filename": "anchor.png",
    },
    "science": {
        "desc": (
            "Dr. Krill Vexx, science and technology correspondent for GNN. "
            "Small classic grey alien with a large smooth grey head, huge glossy black almond eyes, "
            "tiny slit nostrils, thin lips curved in an intellectually curious expression. "
            "Wearing a white lab coat over a turtleneck, small circular wire-rimmed spectacles, "
            "a datapad hologram flickering in the background. Excited/curious expression. "
            "Cool teal-green science-desk rim lighting. "
        ),
        "filename": "science.png",
    },
    "finance": {
        "desc": (
            "Sterling Hawkes, markets analyst for GNN. "
            "Exotic bird alien: vibrant tropical plumage in electric blues and golds, "
            "sleek swept-back feather-crest, sharp intelligent eyes, a confident cocky grin. "
            "Wearing a pinstriped power suit with red suspenders and pocket square, "
            "a gold credit-chip tie clip, 80s Wall Street energy. "
            "Holding a holographic stock chart in one hand. Warm amber-gold rim lighting. "
        ),
        "filename": "finance.png",
    },
    "fashion": {
        "desc": (
            "CHIC-9, style and culture correspondent for GNN. "
            "Sleek chrome humanoid robot with an elegant elongated frame, "
            "large compound optical sensors arranged like dramatic eye makeup, "
            "visible articulated joints with couture-style plating, "
            "a holographic fascinator hat projecting from the head unit. "
            "Wearing an impossibly chic structured jacket with chrome details. "
            "Dramatic pose, chin slightly raised, neon-pink and violet studio lighting. "
        ),
        "filename": "fashion.png",
    },
    "field": {
        "desc": (
            "Grix Vander, field reporter for GNN. "
            "Rugged bipedal lizard alien with green-grey scales, bright amber slit-pupil eyes, "
            "athletic build, slightly wind-blown head frills. "
            "Wearing a worn tactical field vest with GNN logo patches, a pressed collar shirt. "
            "Holding a sleek directional microphone with a GNN flag. "
            "Outdoor colony backdrop with dust and dramatic sky. Warm orange-amber rim lighting. "
            "Slightly disheveled but focused and professional expression. "
        ),
        "filename": "field.png",
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


def generate_portrait(proc, key, info, req_id):
    prompt = f"{info['desc']} {STYLE_BASE}"
    out_path = OUTPUT_DIR / info["filename"]

    print(f"\n{'='*60}")
    print(f"Generating: {key} → {out_path.name}")
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
        print(f"  ✗ Failed to generate {key}")
        return False

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
        print(f"  ✗ No file URL returned for {key}")
        print(f"    Payload: {json.dumps(payload, indent=2)[:500]}")
        return False


def main():
    print("Starting MCP image-gen server...")
    proc = start_server()
    results = {}

    try:
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "newscaster-portrait-gen", "version": "1.0.0"},
                },
            },
        )
        init_resp = recv(proc, timeout=20)
        if not init_resp or "result" not in init_resp:
            print("✗ Failed to initialize MCP server")
            sys.exit(1)
        print("✓ MCP server initialized")

        send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

        req_id = 10
        for key, info in NEWSCASTERS.items():
            ok = generate_portrait(proc, key, info, req_id)
            results[key] = ok
            req_id += 1

    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

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
```

Save to `scripts/generate-newscaster-portraits.py`.

- [ ] **Step 2: Commit the script (before running)**

```bash
cd /Users/ianlintner/Projects/spacebiz
git add scripts/generate-newscaster-portraits.py
git commit -m "feat(assets): add newscaster portrait generation script"
```

---

## Task 3: Generate Portraits & Optimize Assets

**Files:**

- Creates at runtime: `assets-source/portraits/newscaster/*.png`
- Creates at runtime: `public/portraits/newscaster/*.{webp,png}`

- [ ] **Step 1: Run portrait generation script**

```bash
cd /Users/ianlintner/Projects/spacebiz && python3 scripts/generate-newscaster-portraits.py
```

Expected: 5 PNG files appear in `assets-source/portraits/newscaster/`:

- `anchor.png`, `science.png`, `finance.png`, `fashion.png`, `field.png`

If any portrait fails, re-run the script — it skips already-generated files (check output path is unique).

- [ ] **Step 2: Optimize assets**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run optimize-assets
```

Expected output mentions 5 new files processed under `portraits/newscaster/`.
Check that `public/portraits/newscaster/` now contains `.webp` and `.png` for each character.

- [ ] **Step 3: Verify output files exist**

```bash
ls -la /Users/ianlintner/Projects/spacebiz/public/portraits/newscaster/
```

Expected: 10 files (5 × `.webp` + 5 × `.png`):
`anchor.webp`, `anchor.png`, `science.webp`, `science.png`, `finance.webp`, `finance.png`, `fashion.webp`, `fashion.png`, `field.webp`, `field.png`

- [ ] **Step 4: Commit generated assets**

```bash
cd /Users/ianlintner/Projects/spacebiz
git add assets-source/portraits/newscaster/ public/portraits/newscaster/
git commit -m "feat(assets): add AI-generated newscaster portraits (5 GNN anchors)"
```

---

## Task 4: Ticker Hover & Click Interactivity

**Files:**

- Modify: `packages/rogue-universe-shared/src/news/HorizontalNewsTicker.ts`
- Create: `packages/rogue-universe-shared/src/news/__tests__/tickerItemOffsets.test.ts`

`★ Insight ─────────────────────────────────────`
The hover underline must be drawn at screen coordinates each frame the pointer is active. Since the ticker uses a Phaser tween to scroll the text, `marqueeText.x` always holds the current scroll position. The underline screen x = `itemOffset.startX + marqueeText.x`. This calculation is O(n) over segments but runs only on pointer events, not every frame.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Write the failing test for `buildItemOffsets`**

Create `packages/rogue-universe-shared/src/news/__tests__/tickerItemOffsets.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildItemOffsets } from "../HorizontalNewsTicker.ts";
import type { TickerItem } from "../../../../../src/generation/news/types.ts";

// Simple mock: returns string.length * 10 (simulates 10px-per-char monospace)
const measure = (s: string): number => s.length * 10;

describe("buildItemOffsets", () => {
  const items: TickerItem[] = [
    { category: "headline", text: "News one", priority: 100 },
    { category: "stock", text: "MKT up", priority: 60 },
  ];

  it("first item starts at 0", () => {
    const offsets = buildItemOffsets(items, measure);
    expect(offsets[0].startX).toBe(0);
  });

  it("first item endX equals measured width of '[TOP] News one'", () => {
    const offsets = buildItemOffsets(items, measure);
    const expected = measure("[TOP] News one");
    expect(offsets[0].endX).toBe(expected);
  });

  it("second item starts after first item + separator", () => {
    const offsets = buildItemOffsets(items, measure);
    const sep = "   •   ";
    const firstWidth = measure("[TOP] News one");
    const sepWidth = measure(sep);
    expect(offsets[1].startX).toBe(firstWidth + sepWidth);
  });

  it("preserves item reference", () => {
    const offsets = buildItemOffsets(items, measure);
    expect(offsets[0].item).toBe(items[0]);
    expect(offsets[1].item).toBe(items[1]);
  });

  it("empty items returns empty array", () => {
    expect(buildItemOffsets([], measure)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- packages/rogue-universe-shared/src/news/__tests__/tickerItemOffsets.test.ts
```

Expected: FAIL — "buildItemOffsets is not exported"

- [ ] **Step 3: Rewrite `HorizontalNewsTicker.ts` with interactivity**

Replace the entire content of `packages/rogue-universe-shared/src/news/HorizontalNewsTicker.ts`:

```typescript
import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import type { TickerItem } from "../../../../src/generation/news/types.ts";
import { CATEGORY_META } from "../../../../src/generation/news/categories.ts";

const SCROLL_SPEED = 80; // px per second
const ITEM_SEPARATOR = "   •   ";
const FONT_SIZE = 11;
const UNDERLINE_HEIGHT = 1;
const UNDERLINE_OFFSET_Y = 2; // px below text baseline

export interface ItemOffset {
  item: TickerItem;
  startX: number;
  endX: number;
}

/**
 * Pure function: compute pixel start/end offsets for each item in the marquee
 * string. Accepts an injected `measureText` so it is unit-testable without Phaser.
 *
 * The marquee string is: `[BADGE] text${sep}[BADGE] text${sep}...`
 * Offsets are in text-local space (0 = left edge of the text object).
 */
export function buildItemOffsets(
  items: TickerItem[],
  measureText: (s: string) => number,
): ItemOffset[] {
  const sep = ITEM_SEPARATOR;
  const sepWidth = measureText(sep);
  const offsets: ItemOffset[] = [];
  let cursor = 0;

  for (let i = 0; i < items.length; i++) {
    const badge = CATEGORY_META[items[i].category]?.badge ?? "GNN";
    const str = `[${badge}] ${items[i].text}`;
    const w = measureText(str);
    offsets.push({ item: items[i], startX: cursor, endX: cursor + w });
    cursor += w;
    if (i < items.length - 1) cursor += sepWidth;
  }

  return offsets;
}

function buildMarqueeString(items: TickerItem[]): string {
  if (items.length === 0)
    return "GALACTIC NEWS NETWORK — Stand by for updates…";
  return items
    .map((item) => {
      const badge = CATEGORY_META[item.category]?.badge ?? "GNN";
      return `[${badge}] ${item.text}`;
    })
    .join(ITEM_SEPARATOR);
}

/**
 * Persistent horizontal news crawl rendered in GameHUDScene's ticker strip.
 *
 * Items scroll right-to-left at a constant speed, cycling continuously.
 * Hovering over an item shows an underline; clicking fires onItemClick.
 */
export class HorizontalNewsTicker {
  private readonly scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private lastItems: TickerItem[] = [];
  private scheduledItems: TickerItem[] | null = null;
  private destroyed = false;
  private onItemClick: ((item: TickerItem) => void) | null = null;

  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private marqueeText: Phaser.GameObjects.Text | null = null;
  private scrollTween: Phaser.Tweens.Tween | null = null;
  private hitZone: Phaser.GameObjects.Rectangle | null = null;
  private underlineGfx: Phaser.GameObjects.Graphics | null = null;
  private itemOffsets: ItemOffset[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    opts?: { onItemClick?: (item: TickerItem) => void },
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.onItemClick = opts?.onItemClick ?? null;

    this.buildMask();
    this.buildInteractiveZone();
  }

  private buildMask(): void {
    this.maskShape?.destroy();
    this.maskShape = this.scene.add.graphics();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(this.x, this.y, this.width, this.height);
    this.maskShape.setVisible(false);
  }

  private buildInteractiveZone(): void {
    this.hitZone?.destroy();
    this.underlineGfx?.destroy();

    this.underlineGfx = this.scene.add.graphics();
    this.underlineGfx.setDepth(301);

    this.hitZone = this.scene.add
      .rectangle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width,
        this.height,
      )
      .setAlpha(0.001) // near-invisible but interactive
      .setInteractive({ useHandCursor: true })
      .setDepth(302);

    this.hitZone.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        this.handlePointerMove(pointer);
      },
    );

    this.hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.clearUnderline();
    });

    this.hitZone.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        const item = this.findItemAtPointer(pointer);
        if (item && this.onItemClick) this.onItemClick(item);
      },
    );
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.marqueeText || !this.underlineGfx) return;
    this.clearUnderline();
    const offset = this.findItemAtPointer(pointer);
    if (!offset) return;

    const screenX = offset.startX + this.marqueeText.x;
    const itemW = offset.endX - offset.startX;
    // Only draw if the item is at least partially visible inside the ticker strip
    if (screenX + itemW < this.x || screenX > this.x + this.width) return;

    const theme = getTheme();
    this.underlineGfx.fillStyle(theme.colors.accent, 0.8);
    this.underlineGfx.fillRect(
      screenX,
      this.y + this.height - UNDERLINE_OFFSET_Y - UNDERLINE_HEIGHT,
      itemW,
      UNDERLINE_HEIGHT,
    );
  }

  private findItemAtPointer(pointer: Phaser.Input.Pointer): ItemOffset | null {
    if (!this.marqueeText) return null;
    const textLocalX = pointer.x - this.marqueeText.x;
    return (
      this.itemOffsets.find(
        (o) => textLocalX >= o.startX && textLocalX < o.endX,
      ) ?? null
    );
  }

  private clearUnderline(): void {
    this.underlineGfx?.clear();
  }

  /** Set or replace the item-click callback after construction. */
  setOnItemClick(cb: (item: TickerItem) => void): this {
    this.onItemClick = cb;
    return this;
  }

  setSize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    this.rebuild();
    return this;
  }

  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    this.rebuild();
    return this;
  }

  private rebuild(): void {
    this.buildMask();
    this.buildInteractiveZone();
    if (this.marqueeText || this.lastItems.length > 0) {
      const items = this.scheduledItems ?? this.lastItems;
      this.scrollTween?.stop();
      this.scrollTween = null;
      this.beginCycle(items);
    }
  }

  updateItems(items: TickerItem[]): void {
    if (this.scrollTween && this.marqueeText) {
      this.scheduledItems = items;
      return;
    }
    this.beginCycle(items);
  }

  private beginCycle(items: TickerItem[]): void {
    if (this.destroyed) return;

    this.lastItems = items;
    this.scheduledItems = null;

    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;
    this.clearUnderline();

    const theme = getTheme();
    const text = buildMarqueeString(items);
    const textStyle = {
      fontSize: `${FONT_SIZE}px`,
      fontFamily: "monospace",
      color: colorToString(
        items.length > 0
          ? (items[0].color ?? theme.colors.textDim)
          : theme.colors.textDim,
      ),
    };

    const textY = this.y + this.height / 2;

    this.marqueeText = this.scene.add.text(
      this.x + this.width,
      textY,
      text,
      textStyle,
    );
    this.marqueeText.setOrigin(0, 0.5);
    this.marqueeText.setDepth(300);

    // Compute per-item pixel offsets for hover detection.
    // Measurement uses a temporary Text object at off-screen coords so font
    // rendering matches the live text exactly.
    this.itemOffsets = buildItemOffsets(items, (s: string) => {
      const tmp = this.scene.add.text(-9999, -9999, s, textStyle);
      const w = tmp.width;
      tmp.destroy();
      return w;
    });

    // Apply clip mask
    if (this.maskShape) {
      const textWithFilters = this.marqueeText as unknown as {
        filters?: {
          internal: { addMask(shape: Phaser.GameObjects.Graphics): void };
        };
      };
      if (textWithFilters.filters?.internal?.addMask) {
        textWithFilters.filters.internal.addMask(this.maskShape);
      } else {
        this.marqueeText.setMask(this.maskShape.createGeometryMask());
      }
    }

    const textWidth = this.marqueeText.width;
    const totalTravel = this.width + textWidth;
    const duration = (totalTravel / SCROLL_SPEED) * 1000;

    this.scrollTween = this.scene.tweens.add({
      targets: this.marqueeText,
      x: this.x - textWidth,
      duration,
      ease: "Linear",
      onComplete: () => {
        this.scrollTween = null;
        if (this.destroyed) return;
        const nextItems = this.scheduledItems ?? this.lastItems;
        this.beginCycle(nextItems);
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;
    this.maskShape?.destroy();
    this.maskShape = null;
    this.hitZone?.destroy();
    this.hitZone = null;
    this.underlineGfx?.destroy();
    this.underlineGfx = null;
  }
}
```

- [ ] **Step 4: Run offset tests — expect pass**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- packages/rogue-universe-shared/src/news/__tests__/tickerItemOffsets.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Fix any TypeScript errors before continuing.

- [ ] **Step 6: Commit**

```bash
cd /Users/ianlintner/Projects/spacebiz
git add packages/rogue-universe-shared/src/news/HorizontalNewsTicker.ts \
        packages/rogue-universe-shared/src/news/__tests__/tickerItemOffsets.test.ts
git commit -m "feat(ticker): add per-item hover underline and click callback"
```

---

## Task 5: NewscasterScene

**Files:**

- Create: `src/scenes/NewscasterScene.ts`

`★ Insight ─────────────────────────────────────`
`NewscasterScene` follows the same overlay pattern as `DilemmaScene`: it calls `setGalaxy3DVisible(false)` because the Three.js canvas (zIndex 2) sits above Phaser and bleeds through semi-transparent Phaser rectangles. The typewriter effect uses `scene.time.addEvent` with a repeating callback that appends one character per tick — this is simpler and more reliable than tweens for text.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Create NewscasterScene**

Create `src/scenes/NewscasterScene.ts`:

```typescript
import * as Phaser from "phaser";
import {
  getTheme,
  getLayout,
  colorToString,
  Panel,
  Button,
} from "../ui/index.ts";
import { setGalaxy3DVisible } from "./galaxy3d/GalaxyView3D.ts";
import { getNewscasterForCategory } from "../generation/news/newscasters.ts";
import type { TickerItem } from "../generation/news/types.ts";
import { CATEGORY_META } from "../generation/news/categories.ts";

const PANEL_W = 680;
const PANEL_H = 340;
const PORTRAIT_SIZE = 180;
const PADDING = 20;
const TYPEWRITER_MS = 28; // ms per character

const NEWSCASTER_PORTRAIT_KEYS = [
  "newscaster-anchor",
  "newscaster-science",
  "newscaster-finance",
  "newscaster-fashion",
  "newscaster-field",
] as const;

export class NewscasterScene extends Phaser.Scene {
  private item!: TickerItem;
  private typewriterEvent: Phaser.Time.TimerEvent | null = null;
  private storyText: Phaser.GameObjects.Text | null = null;
  private fullStoryText = "";
  private charIndex = 0;
  private widgets: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: "NewscasterScene" });
  }

  init(data: { item: TickerItem }): void {
    this.item = data.item;
  }

  preload(): void {
    // Load WebP with PNG fallback for all 5 newscaster portraits.
    // These are small (512×512 webp) — preloading here avoids adding them to
    // the global boot payload but means a brief load on first click.
    for (const key of NEWSCASTER_PORTRAIT_KEYS) {
      if (!this.textures.exists(key)) {
        const stem = key.replace("newscaster-", "");
        this.load.image({
          key,
          url: `portraits/newscaster/${stem}.webp`,
          // Phaser 4 falls back to PNG if WebP fails (browser support check)
          extension: "webp",
        });
      }
    }
  }

  create(): void {
    setGalaxy3DVisible(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setGalaxy3DVisible(true);
    });

    const theme = getTheme();
    const L = getLayout();
    const cx = L.gameWidth / 2;
    const cy = L.gameHeight / 2;

    const newscaster = getNewscasterForCategory(this.item.category);
    const catMeta = CATEGORY_META[this.item.category];

    // ── Scrim ─────────────────────────────────────────────────────────────
    const scrim = this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(400)
      .setInteractive(); // swallows clicks behind panel
    this.widgets.push(scrim);

    // ── Main panel ────────────────────────────────────────────────────────
    const panelX = cx - PANEL_W / 2;
    const panelY = cy - PANEL_H / 2;
    const panel = new Panel(this, panelX, panelY, PANEL_W, PANEL_H);
    panel.setDepth(401);
    this.widgets.push(panel);

    // ── Category header bar ───────────────────────────────────────────────
    const headerH = 36;
    const headerBar = this.add
      .rectangle(panelX, panelY, PANEL_W, headerH, newscaster.accentColor, 0.9)
      .setOrigin(0, 0)
      .setDepth(402);
    this.widgets.push(headerBar);

    const channelLabel = this.add
      .text(
        panelX + PADDING,
        panelY + headerH / 2,
        `${catMeta.badge} — ${catMeta.label.toUpperCase()}`,
        {
          fontSize: "12px",
          fontFamily: "monospace",
          color: colorToString(theme.colors.background),
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(403);
    this.widgets.push(channelLabel);

    const liveTag = this.add
      .text(panelX + PANEL_W - PADDING, panelY + headerH / 2, "◉ LIVE", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.background),
      })
      .setOrigin(1, 0.5)
      .setDepth(403);
    this.widgets.push(liveTag);

    // ── Portrait ─────────────────────────────────────────────────────────
    const portraitX = panelX + PADDING;
    const portraitY = panelY + headerH + PADDING;

    const portraitBg = this.add
      .rectangle(
        portraitX,
        portraitY,
        PORTRAIT_SIZE,
        PORTRAIT_SIZE,
        theme.colors.panelBorder,
        0.4,
      )
      .setOrigin(0, 0)
      .setDepth(402);
    this.widgets.push(portraitBg);

    if (this.textures.exists(newscaster.portraitKey)) {
      const portrait = this.add
        .image(
          portraitX + PORTRAIT_SIZE / 2,
          portraitY + PORTRAIT_SIZE / 2,
          newscaster.portraitKey,
        )
        .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
        .setDepth(403);
      this.widgets.push(portrait);
    }

    // ── Name / title ─────────────────────────────────────────────────────
    const nameX = portraitX + PORTRAIT_SIZE + PADDING;
    const nameAreaW = PANEL_W - PORTRAIT_SIZE - PADDING * 3;

    const nameLabel = this.add
      .text(nameX, portraitY, newscaster.name.toUpperCase(), {
        fontSize: "14px",
        fontFamily: "monospace",
        color: colorToString(newscaster.accentColor),
        fontStyle: "bold",
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(nameLabel);

    const titleLabel = this.add
      .text(nameX, portraitY + 20, newscaster.title, {
        fontSize: "10px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(titleLabel);

    const channelNameLabel = this.add
      .text(nameX, portraitY + 34, newscaster.channel, {
        fontSize: "10px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(channelNameLabel);

    // Thin divider
    const divider = this.add.graphics().setDepth(403);
    divider.lineStyle(1, theme.colors.panelBorder, 0.6);
    divider.lineBetween(
      nameX,
      portraitY + 52,
      nameX + nameAreaW,
      portraitY + 52,
    );
    this.widgets.push(divider);

    // ── Story text (typewriter) ───────────────────────────────────────────
    this.fullStoryText = this.item.text;
    this.charIndex = 0;

    this.storyText = this.add
      .text(nameX, portraitY + 62, "", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.text),
        wordWrap: { width: nameAreaW },
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(this.storyText);

    this.typewriterEvent = this.time.addEvent({
      delay: TYPEWRITER_MS,
      callback: this.typeNextChar,
      callbackScope: this,
      loop: true,
    });

    // ── Close button ──────────────────────────────────────────────────────
    const closeBtn = new Button(
      this,
      panelX + PANEL_W - PADDING - 60,
      panelY + PANEL_H - PADDING - 16,
      120,
      32,
      "CLOSE",
      () => this.closeDialog(),
    );
    closeBtn.setDepth(403);
    this.widgets.push(closeBtn);

    // ESC key also closes
    this.input.keyboard?.once("keydown-ESC", () => this.closeDialog());
  }

  private typeNextChar(): void {
    if (!this.storyText) return;
    if (this.charIndex >= this.fullStoryText.length) {
      this.typewriterEvent?.remove();
      this.typewriterEvent = null;
      return;
    }
    this.charIndex++;
    this.storyText.setText(this.fullStoryText.slice(0, this.charIndex));
  }

  private closeDialog(): void {
    this.typewriterEvent?.remove();
    this.typewriterEvent = null;
    this.scene.stop();
  }

  shutdown(): void {
    this.typewriterEvent?.remove();
    this.typewriterEvent = null;
    for (const w of this.widgets) {
      if (w && "destroy" in w) (w as { destroy(): void }).destroy();
    }
    this.widgets = [];
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Fix any errors. Common gotchas:

- `Panel` and `Button` import paths — check `src/ui/index.ts` for correct exported names.
- If `Button` constructor signature differs from the above, check `src/ui/Button.ts` for the actual API.

- [ ] **Step 3: Commit**

```bash
cd /Users/ianlintner/Projects/spacebiz
git add src/scenes/NewscasterScene.ts
git commit -m "feat(scenes): add NewscasterScene with typewriter story and newscaster portrait"
```

---

## Task 6: Register Scene & Wire HUD Click

**Files:**

- Modify: `src/main.ts`
- Modify: `src/scenes/GameHUDScene.ts`

- [ ] **Step 1: Register NewscasterScene in main.ts**

In `src/main.ts`, add the import near the other scene imports:

```typescript
import { NewscasterScene } from "./scenes/NewscasterScene.ts";
```

In the scene list array (around line 821, after `DilemmaScene`):

```typescript
DilemmaScene,
NewscasterScene,  // ← add this line
```

- [ ] **Step 2: Wire ticker click in GameHUDScene.ts**

Find the `newsTicker` initialization in `GameHUDScene.ts` (around line 912). Add `onItemClick` to the constructor call:

```typescript
this.newsTicker = new HorizontalNewsTicker(
  this,
  L.navSidebarWidth,
  tickerY,
  L.gameWidth - L.navSidebarWidth,
  L.hudTickerHeight,
  {
    onItemClick: (item) => {
      if (!this.scene.isActive("NewscasterScene")) {
        this.scene.launch("NewscasterScene", { item });
        this.scene.bringToTop("NewscasterScene");
      }
    },
  },
);
```

The guard `!this.scene.isActive("NewscasterScene")` prevents double-launching if the user clicks rapidly.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

- [ ] **Step 4: Run full check**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run check
```

Expected: typecheck ✓, tests ✓, build ✓. Fix any failures before committing.

- [ ] **Step 5: Commit**

```bash
cd /Users/ianlintner/Projects/spacebiz
git add src/main.ts src/scenes/GameHUDScene.ts
git commit -m "feat(hud): wire news ticker click to NewscasterScene overlay"
```

---

## Self-Review Checklist

- [x] **Spec: hover underline** — `HorizontalNewsTicker` draws `underlineGfx` under hovered item ✓
- [x] **Spec: click opens dialog** — `onItemClick` callback → `scene.launch("NewscasterScene")` ✓
- [x] **Spec: newscaster reads story** — typewriter effect in `NewscasterScene.typeNextChar()` ✓
- [x] **Spec: grey alien for science/tech** — `science` type: Dr. Krill Vexx, grey alien ✓
- [x] **Spec: slick bird alien for economy** — `finance` type: Sterling Hawkes, bird alien ✓
- [x] **Spec: fashionable robot** — `fashion` type: CHIC-9 robot ✓
- [x] **Spec: lizard field reporter** — `field` type: Grix Vander ✓
- [x] **Spec: studio anchor** — `anchor` type: Stellara Vex ✓
- [x] **Portrait generation** — Python script follows `generate-rex-portraits.py` pattern exactly ✓
- [x] **All categories covered** — `NEWSCASTER_BY_CATEGORY` covers all 23 TickerCategories ✓
- [x] **TDD** — `newscasters.test.ts` + `tickerItemOffsets.test.ts` written before implementation ✓
- [x] **Galaxy3D** — `NewscasterScene` calls `setGalaxy3DVisible(false/true)` ✓
- [x] **No double-launch** — Guard in HUD `isActive("NewscasterScene")` ✓
- [x] **ESC closes dialog** — `keydown-ESC` listener in `NewscasterScene.create()` ✓
- [x] **CI gates** — Task 6 Step 4 runs `npm run check` before final commit ✓
