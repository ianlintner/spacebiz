# Star Freight Tycoon 🚀

<img width="512" alt="cargo" src="https://github.com/user-attachments/assets/ab5101f7-1d86-456c-9fa2-6f9821a846f9" />

A browser-based, turn-driven space trading and fleet management game built with **TypeScript**, **Phaser**, and **Vite**.

You run a growing freight company in a living galaxy: buy low, sell high, expand your fleet, optimize routes, survive market swings, and chase the high score.

## Features

- Procedurally generated galaxy and market setup
- Turn simulation with economy updates and events
- Fleet, routes, and finance management scenes
- Retro-inspired UI and audio systems
- Strong unit test coverage across core game systems

## Tech Stack

- **Engine/UI:** Phaser 3
- **Language:** TypeScript
- **Build Tool:** Vite
- **Testing:** Vitest

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Install

```bash
npm ci
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run tests

```bash
npm run test
```

## Quality Gates (CI)

On pull requests and pushes to `main`, CI runs:

1. Type checking (`npm run typecheck`)
2. Unit tests (`npm run test`)
3. Production build (`npm run build`)


GitHub Pages deployment also enforces these gates before publish.

## Deployment

This repository is configured to deploy automatically to **GitHub Pages** from `main` using GitHub Actions.

If this is your first time enabling Pages for the repo:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or manually run the deploy workflow).

## Project Structure

- `src/scenes/` – game scenes and flow
- `src/game/` – simulation, economy, events, fleet, routes, scoring
- `src/generation/` – world/market/name generation
- `src/ui/` – reusable UI components and theme primitives
- `src/data/` – game state store, constants, shared types

## Contributing

Contributions are welcome! If you’d like to help:

1. Fork the repo
2. Create a feature branch
3. Add or update tests for your changes
4. Open a PR

Please keep gameplay logic deterministic where possible and maintain/expand test coverage for non-visual systems.

## License

No license file has been added yet.

If you want this to be fully open source, add a license (MIT is a common choice for indie game projects).
