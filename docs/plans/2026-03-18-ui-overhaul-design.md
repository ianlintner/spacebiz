# Star Freight Tycoon — UI Overhaul Design

> Stellaris-inspired glass panel aesthetic with KOEI-style portrait system

## 1. Visual Foundation

### Panel Glass Effect

- Semi-transparent panels (70-80% alpha) with dark gradient fill (top darker → bottom lighter)
- 1px inner glow line using accent color at ~30% alpha behind the crisp border
- Chamfered/angled corner cuts (diagonal lines at panel corners, Stellaris-style)

### Neon Accent System

- Panel borders get a subtle glow — wider, lower-alpha accent color drawn behind crisp border
- Active/selected elements get a brighter glow pulse (Phaser tween on alpha)
- Buttons get a bottom-edge highlight — 1px accent line that brightens on hover
- Section dividers use gradient lines (accent → transparent fade)

### Background Depth

- Scene backgrounds: subtle radial gradient (lighter center, darker edges) instead of flat color
- Starfield particle layer behind all content — sparse, slowly drifting dots
- HUD top bar: horizontal gradient with slight transparency

### Max Width Constraint

- `MAX_CONTENT_WIDTH = 1100` — all content panels centered within this
- HUD spans full width for immersion
- Prevents ridiculous stretching on ultrawide monitors

## 2. Portrait & Detail Image System

### PortraitPanel Component

- Reusable UI component (`src/ui/PortraitPanel.ts`) extending Container
- Lives in left sidebar (~240px wide), below HUD top bar
- Shows procedurally generated scene-appropriate image that changes with selection
- Layout: portrait image (top ~60%), name label, 3-4 key stat lines below

### PortraitGenerator

- Pure functions in `src/ui/PortraitGenerator.ts` that draw into Phaser Graphics
- Seed-based variation — same planet always looks the same, different planets look different
- Each portrait type: `drawPlanetPortrait(graphics, planetType, width, height, seed)`, `drawShipPortrait(graphics, shipClass, width, height)`, etc.

### Portrait Types

| Context               | Content                                                            | Palette                   |
| --------------------- | ------------------------------------------------------------------ | ------------------------- |
| Planet (Terran)       | Gradient sky + green/blue terrain bands + city silhouette          | Blues, greens, white      |
| Planet (Mining)       | Dark gradient + rocky terrain + mining rig silhouettes + ore veins | Browns, oranges, red glow |
| Planet (Agricultural) | Warm gradient + rolling field bands + silo silhouettes             | Greens, yellows, amber    |
| Planet (Industrial)   | Smoky gradient + factory silhouettes + smoke stacks                | Grays, steel blue, orange |
| Planet (Hub Station)  | Space gradient + station ring structure (geometric)                | Dark blue, white, accent  |
| Planet (Resort)       | Bright gradient + water bands + dome silhouettes                   | Turquoise, pink, golden   |
| Planet (Research)     | Dark gradient + dish/telescope silhouettes + data lines            | Purple, cyan, white       |
| Ship                  | Space gradient + ship silhouette (varies by class) + engine glow   | Dark space + class accent |
| Star System           | Black space + central star (radial gradient) + planet dots         | Star color from data      |
| Event                 | Thematic per category — explosions, gifts, chart lines             | Category-dependent        |

## 3. Scene Layout Overhaul

### Shared Layout Constants

```
MAX_CONTENT_WIDTH = 1100
SIDEBAR_WIDTH = 240
CONTENT_GAP = 12
HUD_TOP = 56
HUD_BOTTOM = 52
Content height = 720 - 56 - 52 = 612
```

### Per-Scene Changes

**MainMenuScene** — Starfield background, title with glow/shadow, glass panel behind buttons. No sidebar.

**GalaxySetupScene** — Starfield. System option cards as glass panels. Selected card gets neon border glow. System portrait banner above cards.

**GameHUDScene** — Top bar: horizontal gradient + transparency. Nav buttons: glass tab style with accent underline on active. Cash: glow flash on change (green gain, red loss).

**GalaxyMapScene** — No sidebar (map is the visual). Starfield background. System dots with glow halos. Route lines dashed with animated opacity. Sector boundaries as gradient-edged regions.

**SystemMapScene** — Sidebar: system portrait (star + orbits), swaps to planet portrait on click. Content: solar system viz with glowing star and orbiting planets.

**PlanetDetailScene** — Sidebar: planet portrait + name/type/population. Content: market DataTable with glass rows, neon-tinted price cells.

**FleetScene** — Sidebar: ship portrait of selected ship + stats. Content: fleet DataTable. Row selection updates sidebar.

**RoutesScene** — Sidebar: destination planet portrait of selected route. Content: routes DataTable + action buttons.

**FinanceScene** — Sidebar: company health indicator graphic. Content: tab panels for P&L/Balance/Loans, glass-styled.

**MarketScene** — Sidebar: planet portrait of selected row. Content: market DataTable with color-coded prices.

**SimPlaybackScene** — Full-screen, no sidebar. Starfield. Ship dots with glow trails. Glass event cards. Glass ticker overlay.

**TurnReportScene** — Sidebar: turn summary graphic. Content: P&L + route performance + news, all glass panels.

**GameOverScene** — Full-screen. Starfield. Win/lose with glow. Centered glass score panel. High score table.

### Starfield Utility

Shared `src/ui/Starfield.ts`:

- N small white dots at random positions, varying alpha (0.2-0.8) and size (1-3px)
- Optional slow drift tween for parallax feel
- Sits at depth 0 behind everything
