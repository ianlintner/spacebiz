# Star Freight Tycoon — Stellaris-Style UI Overhaul Design

> **Goal:** Transform the functional-but-flat prototype UI into a polished, immersive space game interface inspired by Stellaris (glass panels, neon accents, transparency, depth) and KOEI games (talking-head portraits, contextual detail images).

---

## 1. Visual Foundation

### 1A. Panel Glass Effect

Replace opaque flat-filled panels with semi-transparent gradient panels:

- **Background**: 70–80% alpha dark gradient (top darker → bottom slightly lighter)
- **Border**: 1px inner glow line using accent color at ~30% alpha, plus the existing border
- **Corner treatment**: Stellaris-style chamfered/angled corner cuts — diagonal lines at panel corners rather than sharp right angles
- Regenerate all NineSlice textures in BootScene to incorporate gradients and transparency

### 1B. Neon Accent System

- Panel borders get a subtle **glow effect** — a wider, lower-alpha version of accent color drawn behind the crisp border
- Active/selected elements get a **brighter glow pulse** (Phaser tween on alpha)
- Buttons get a **bottom edge highlight** — 1px accent line that brightens on hover
- Section dividers use a **gradient line** (fade from accent → transparent)

### 1C. Background Depth

- Scene backgrounds: **subtle radial gradient** (lighter center, darker edges) instead of flat color
- **Starfield particle layer** behind all content — sparse, slowly drifting white dots with varying alpha (0.2–0.8) and size (1–3px)
- HUD top bar: **horizontal gradient** with slight transparency

### 1D. Max Width Constraint

- `MAX_CONTENT_WIDTH = 1100` pixels — all content panels/tables centered within this
- HUD spans full width for immersion
- Prevents ridiculous stretching on ultrawide screens

---

## 2. Portrait & Detail Image System

### 2A. Components

- **`src/ui/PortraitPanel.ts`** — Reusable container: image area (top ~60%) + name label + 3–4 stat labels below. 240px wide. Accepts a portrait type + data to render.
- **`src/ui/PortraitGenerator.ts`** — Pure functions that draw procedural art into a Phaser Graphics object. Each portrait type has its own function.

### 2B. Portrait Types

| Type                 | Content                                                                          | Palette                   |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| Planet: Terran       | Gradient sky + green/blue terrain bands + city silhouette                        | Blues, greens, white      |
| Planet: Mining       | Dark gradient + rocky terrain + mining rig silhouettes + ore veins               | Browns, oranges, red glow |
| Planet: Agricultural | Warm gradient + rolling field bands + silo silhouettes                           | Greens, yellows, amber    |
| Planet: Industrial   | Smoky gradient + factory silhouettes + smokestacks                               | Grays, steel blue, orange |
| Planet: Hub Station  | Space gradient + station ring geometry                                           | Dark blue, white, accent  |
| Planet: Resort       | Bright gradient + water bands + dome silhouettes                                 | Turquoise, pink, golden   |
| Planet: Research     | Dark gradient + dish/telescope silhouettes + data stream lines                   | Purple, cyan, white       |
| Ship                 | Space gradient + ship silhouette (varies by class) + engine glow                 | Dark space + class accent |
| Star System          | Black space + radial gradient star + orbiting planet dots                        | System star color         |
| Event                | Category-themed: explosion for hazards, star for opportunities, chart for market | Category-dependent        |

### 2C. Design Principles

- Seed-based variation: same planet always renders the same portrait, different planets differ
- Silhouettes built from simple Phaser Graphics shapes (rectangles, triangles, circles, lines)
- Gradient fills via multiple overlapping semi-transparent rectangles
- Each draw function: `draw{Type}Portrait(graphics, data, width, height, seed)`

---

## 3. Scene Layout Overhaul

### 3A. Shared Layout Constants

```
MAX_CONTENT_WIDTH = 1100
SIDEBAR_WIDTH     = 240
CONTENT_GAP       = 12
HUD_TOP           = 56   (below HUD top bar)
HUD_BOTTOM        = 52   (above HUD nav bar)
CONTENT_HEIGHT    = 612   (720 - HUD_TOP - HUD_BOTTOM)
```

### 3B. Scene-by-Scene Changes

**MainMenuScene** — Starfield background. Large title with glow/shadow. Translucent glass panel behind buttons. No sidebar (menu screen).

**GalaxySetupScene** — Starfield. System option cards become glass panels. Selected card gets neon accent border glow. Portrait of selected system in banner area above cards.

**GameHUDScene** — Top bar: horizontal gradient + slight transparency. Nav buttons: glass tab style with accent underline on active. Cash: glow flash on change (green gain, red loss).

**GalaxyMapScene** — No sidebar (map is the visual). Starfield background. System dots get glow halos. Route lines: dashed with animated opacity. Sector boundaries: subtle gradient-edged regions.

**SystemMapScene** — Left sidebar: system portrait (star + orbits), click planet → switches to planet portrait. Content: solar system visualization with glowing star and orbiting planet circles.

**PlanetDetailScene** — Left sidebar: planet portrait + name/type/population. Right: market DataTable with glass rows. Neon-tinted price cells (green=profitable, red=saturated).

**FleetScene** — Left sidebar: ship portrait of selected ship + name/class/condition bar/speed. Right: fleet DataTable. Selection updates sidebar.

**RoutesScene** — Left sidebar: destination planet portrait of selected route. Right: routes DataTable + action buttons.

**FinanceScene** — Left sidebar: company health indicator graphic (green/yellow/red gauge). Right: tab panels for P&L / Balance Sheet / Loans. Glass-styled panels.

**MarketScene** — Left sidebar: planet portrait of selected row. Right: market overview DataTable with color-coded price cells.

**SimPlaybackScene** — Full-screen (no sidebar). Starfield. Ship dots get glow trails. Event popups: glass-styled with neon accent borders. Revenue ticker: glass overlay panel.

**TurnReportScene** — Left sidebar: turn summary portrait (stylized chart/graph or company emblem). Right: P&L + route performance + news digest in glass panels.

**GameOverScene** — Full-screen. Starfield. Large win/lose with glow effect. Score breakdown in centered glass panel. High score table below.

### 3C. Starfield Background Component

Shared utility `src/ui/Starfield.ts`:

- Creates N small white dots at random positions, varying alpha (0.2–0.8) and size (1–3px)
- Optional slow drift tween for subtle parallax
- Sits at depth 0 behind everything
- Any scene can add it with one call
