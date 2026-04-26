# Copilot Instructions — Star Freight Tycoon

## Project Overview

Star Freight Tycoon is a sci-fi trading/tycoon game built with **Phaser 3** and **TypeScript**, bundled with **Vite 8**, tested with **Vitest 4**, on **Node 22**.

## Repository Structure

- `src/` — Main game source (scenes, game logic, data, UI, audio, utils)
- `packages/spacebiz-ui/` — Shared UI component library (`@spacebiz/ui` path alias)
- `styleguide/` — Visual styleguide app (separate Vite entry)
- `public/` — Static assets and concept pages
- `docs/plans/` — Design documents and implementation plans

## Build & Run

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server
npm run build        # typecheck + production build
npm run preview      # preview production build
```

## Quality Gates (CI)

Before submitting any code, **all three gates must pass locally**:

```bash
npm run typecheck    # tsc --noEmit (strict mode, no unused locals/params)
npm run test         # vitest run
npm run build        # tsc && vite build
```

Or run them all at once:

```bash
npm run check        # typecheck && test && build
```

CI (`.github/workflows/ci.yml`) runs exactly these three steps on every PR and push to `main` using Node 22 on Ubuntu.

**Always run `npm run check` after making changes and fix any errors before considering work complete.**

## TypeScript Configuration

- Target: ES2023, module: ESNext, strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` are **on** — remove dead code
- `verbatimModuleSyntax` — use `import type` for type-only imports
- `erasableSyntaxOnly` — no enums or namespaces; use unions and plain objects
- Path alias: `@spacebiz/ui` → `packages/spacebiz-ui/src/index.ts`

## Testing

- Framework: Vitest 4 with `globals: true`, environment: node
- Test files live in `__tests__/` directories next to source, named `*.test.ts`
- Run `npm run test` (single run) or `npm run test:watch` (watch mode)

## Code Conventions

- Phaser scenes extend `Phaser.Scene` and are registered in scene configs
- UI components follow the patterns in `src/ui/` and `packages/spacebiz-ui/src/`
- Game state is managed through `src/data/GameStore.ts`
- Use `SeededRNG` from `src/utils/` for deterministic randomness
- Keep solutions lightweight — this is an indie game project

## Key Rules

1. **Never skip CI gates.** Run `npm run check` after every change.
2. **No unused imports or variables.** TypeScript strict checks will catch them.
3. **Use `import type` for type-only imports** (enforced by `verbatimModuleSyntax`).
4. **Do not use enums or namespaces** (`erasableSyntaxOnly`).
5. **Write tests** for new game logic, utilities, and data transformations.
6. **Keep Phaser and Web Audio solutions simple** and browser-compatible.

## Caretaker

This repo uses the [caretaker](https://github.com/ianlintner/caretaker) autonomous
maintenance system. The orchestrator runs daily via GitHub Actions and assigns tasks to
`@copilot` via structured issue and PR comments.

Agent instruction files live in `.github/agents/`:

- `maintainer-pr.md` — how to respond to PR fix requests
- `maintainer-issue.md` — how to execute assigned issues
- `maintainer-upgrade.md` — how to apply caretaker upgrades

Always check these files when you receive a caretaker assignment.
