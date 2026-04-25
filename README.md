# Star Freight Tycoon 🚀

<img width="512" alt="cargo" src="https://github.com/user-attachments/assets/ab5101f7-1d86-456c-9fa2-6f9821a846f9" />

> **GREETINGS, CAPTAIN.** A freshly-printed corporate charter, two starter
> hulls, and a quarterly P&L stand between you and a galaxy of cargo waiting
> to be moved. Welcome to **Star Freight Tycoon** — a browser-based, turn-driven
> space-trade sim built in **TypeScript**, **Phaser 4**, and **Vite**.

Buy low, sell high, expand your fleet, optimize routes, weather the market
swings, and climb the high-score table — across procedurally generated
galaxies. It's the spiritual lovechild of **Aerobiz Supersonic**,
**Master of Orion 2**, and **Transport Tycoon**, with the build pipeline of
2026 and the operating manual energy of 1996.

## What's in the box

- **Procedural galaxies** with seeded RNG — same seed, same map, every time.
- **Hybrid turn loop** — Plan → Simulate → Review. Set your routes, hit
  *End Quarter*, watch the simulation play out, then read the report.
- **Living economy** — planet types produce and demand; saturate a market
  and prices crater; events shake everything up.
- **Rival AI empires** with named CEOs, portraits, and competing fleets.
- **Mid-quarter dilemmas** — narrative choices with success-rate scaling
  and AI-generated story beats.
- **Save / load** — autosaves to localStorage every turn; full state
  resume across browser refreshes.
- **Phaser-canvas-only UI** — no DOM overlays. Reusable component library
  with theme primitives, scrollable lists, data tables, modals, tooltips.
- **In-app QA console** — `window.__sft` lets you script the game from
  devtools, Playwright, or an MCP-driven agent. See
  [`docs/qa/console-api.md`](docs/qa/console-api.md).

## Tech stack

| Layer        | Choice                                                              |
| ------------ | ------------------------------------------------------------------- |
| Engine       | **Phaser 4** (WebGL renderer, RenderNode arch, unified Filter API)  |
| Language     | TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`)   |
| Bundler      | Vite 8                                                              |
| Tests        | Vitest 4 — **723 tests across 50 files**, all pure-function         |
| Runtime      | Node 22+, npm 10+                                                   |
| Optional MCP | `@spacebiz/qa-mcp` — drive the running game from an LLM agent       |

## Getting started

```bash
npm ci              # install (uses workspaces; pulls @spacebiz/ui too)
npm run dev         # localhost:5173
npm run typecheck   # strict TS, no unused locals/params
npm run test        # vitest
npm run build       # tsc && vite build
npm run check       # all three CI gates back-to-back
```

`npm run optimize-assets` regenerates the WebP/PNG portrait set under
`public/portraits/` from the high-res sources in `assets-source/`. See the
[asset pipeline notes in `CLAUDE.md`](CLAUDE.md) before adding new portraits.

## Project layout

```
src/
├── scenes/            # 23 Phaser scenes (one screen each)
│   ├── BootScene, MainMenuScene, GalaxySetupScene
│   ├── GalaxyMapScene, SystemMapScene, PlanetDetailScene
│   ├── FleetScene, RoutesScene, ContractsScene, MarketScene
│   ├── TechTreeScene, FinanceScene, StationBuilderScene
│   ├── EmpireScene, CompetitionScene
│   ├── DilemmaScene, SimPlaybackScene, TurnReportScene
│   └── GameOverScene, SimSummaryScene, AISandboxScene, …
├── game/              # simulation, save, portrait loader, scoring
├── data/              # GameStore (state + EventEmitter), constants, types
├── ui/                # game-specific widgets (PortraitPanel, MiniMap, …)
├── audio/             # AudioDirector + retro-pop SFX hooks
├── generation/        # procedural galaxy + market generation
├── testing/           # window.__sft QA façade (DEV + ?debug=1 in prod)
└── siteContent.ts     # homepage manual + cheat sheets

packages/
├── spacebiz-ui/       # 28-file Phaser UI component library (@spacebiz/ui)
└── spacebiz-qa-mcp/   # optional MCP server for agent-driven QA

styleguide/            # visual styleguide app — separate Vite entry
docs/plans/            # design + implementation plans (dated artifacts)
docs/qa/console-api.md # QA façade reference
```

## CI gates

CI runs Node 22 on Ubuntu and enforces three gates on every push:

1. `npm run typecheck` — strict TS, no unused locals/params.
2. `npm run test` — full Vitest run.
3. `npm run build` — production bundle.

GitHub Pages deployment also runs these gates before publishing.

## Deployment

Auto-deploys to **GitHub Pages** from `main` via Actions. First time:

1. **Settings → Pages** → Source: **GitHub Actions**.
2. Push to `main` (or trigger the deploy workflow manually).

## Conventions worth knowing

- Game state lives in `src/data/GameStore.ts` (singleton, plain objects + EventEmitter).
- Game logic is **pure** — every simulation function is testable without Phaser.
- Deterministic RNG via `src/utils/SeededRNG.ts`.
- No TS enums; use `as const` objects (the tsconfig forbids enums).
- Phaser is imported as `import * as Phaser from "phaser"` (v4 dropped the
  default export).
- For masks, use the v4 filter API:
  `gameObject.filters?.internal.addMask(maskShape)` — not `setMask()`.

## Contributing

PRs welcome. Keep simulation logic deterministic. Add or update Vitest
coverage for non-visual systems. Run `npm run check` before pushing.

```
1. Fork the repo
2. Branch off main
3. Add tests with your changes
4. Open a PR — CI will run all three gates
```

## License

No license file yet. If this project should be open source, MIT is a
reasonable default for indie game projects.

---

> *"Profit is just gravity in disguise. Find a producer, find a buyer,
> point the ship between them, and let the universe do the rest."*
> — Apocryphal, attributed to every freight captain who ever lived.
