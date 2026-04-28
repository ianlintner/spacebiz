# Contributing to @spacebiz/ui

Thanks for your interest. This package lives inside the
[Star Freight Tycoon](https://github.com/ianlintner/space-tycoon) monorepo and
is consumed both by that game and (eventually) by other projects via npm.

## Running tests

From the repo root:

```bash
npm test --workspace @spacebiz/ui
```

Or to run the entire CI gate (typecheck + lint + format + tests + build):

```bash
npm run check
```

Tests use Vitest and live in `__tests__/` directories alongside the source
they cover.

## Adding a new component

1. **File location** — pick the right tier folder under `src/`. Tier 1 is the
   current flat layout (e.g. `Button.ts`, `Panel.ts`). New components should
   be theme-driven and free of any game-specific knowledge.
2. **Naming** — `PascalCase` class name and filename. Config interface is
   `<Component>Config`. Export both from `src/index.ts`.
3. **API shape** — extend `Phaser.GameObjects.Container`, accept
   `(scene: Phaser.Scene, config: <Component>Config)`. Read styling from
   `getTheme()` rather than hard-coded colors.
4. **Test** — add `__tests__/<Component>.test.ts`. Cover the public API and
   any pure helpers.
5. **Styleguide** — register a section in the styleguide app
   (`styleguide/scenes/StyleguideScene.ts`) so the component is visible in
   `/styleguide/`.
6. **Docs** — add `docs/<component>.md` with a brief API description and
   example.

## Code style

- Prettier and ESLint run on the whole monorepo. `npm run format` and
  `npm run lint` from the root.
- TypeScript strict mode with `verbatimModuleSyntax` (use `import type`) and
  `erasableSyntaxOnly` (no enums, no namespaces — use `as const` objects and
  union types).
- Phaser 4 imports: `import * as Phaser from "phaser"`.
- For masks use the v4 filter API:
  `gameObject.filters?.internal.addMask(maskShape)` — not `setMask()`.

## Filing issues

Open an issue at
<https://github.com/ianlintner/space-tycoon/issues>. Include:

- Phaser version.
- Minimal reproduction (a CodeSandbox or a tiny scene class is ideal).
- Expected vs actual behavior.
- Browser and OS if rendering-related.
