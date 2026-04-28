# Visual regression tests

This directory holds Playwright `toHaveScreenshot()` baselines for the
`/styleguide/` Vite entry. The styleguide renders every component in the
`@spacebiz/ui` library against deterministic data; capturing it pixel-by-pixel
gives us a fast, low-flake guard against accidental visual drift.

## What is covered

`styleguide.spec.ts` produces one screenshot per styleguide section. Sections
are discovered at runtime via `window.__styleguideSections` (populated by
`styleguide/scenes/StyleguideScene.ts`). Today this includes:

- `colors`, `typography`, `buttons`, `panels`, `progress-bars`,
  `scrollable-lists`, `tab-groups`, `data-table`, `tooltips`, `floating-text`,
  `ambient-fx`, `milestones`, `modals`, `icon-gallery`, `cargo-icons`,
  `hud-bar`, `portraits`, `portrait-gallery`, `spacing`, `depth-layers`,
  `glass-effect`, `animation-timing`, `stat-row`, `info-card`, `icon-button`,
  `status-badge`.

Three full-page screenshots are also captured: `full-default.png`,
`full-dark.png`, `full-high-contrast.png`. The dark / high-contrast cases
auto-skip when the theme switcher is not wired up in the current build (see
unit 11 / unit 20 of the UI-library plan).

Baselines live under `e2e/visual/<spec-file>-snapshots/` (Playwright's default
layout) and are committed to the repo so CI can compare against them. Each PNG
is suffixed with the project name + platform (e.g. `-visual-darwin.png`,
`-visual-linux.png`) so macOS dev baselines and Linux CI baselines can coexist.

## Updating baselines

When an intentional visual change lands (new component, theme tweak,
typography update, etc.):

```bash
# 1. Start the dev server (or let Playwright start one for you).
npm run dev

# 2. Regenerate every baseline in this directory.
npm run test:visual:update

# 3. Inspect the diffs in `git status` — confirm each change is intended.

# 4. Re-run without --update to confirm everything matches.
npm run test:visual

# 5. Commit the updated PNGs along with the source change.
git add e2e/visual && git commit
```

Updating a single section:

```bash
npx playwright test --project=visual e2e/visual/styleguide.spec.ts \
  --update-snapshots --grep "section-buttons"
```

## How CI fails on diff

The `e2e` job in `.github/workflows/ci.yml` runs `npm run test:e2e`, which
includes the `visual` Playwright project. On any pixel diff exceeding the
configured thresholds (`maxDiffPixelRatio: 0.02`, `threshold: 0.2`), Playwright
fails the test and writes:

- `test-results/<spec>/<test>-actual.png` — what the run produced
- `test-results/<spec>/<test>-expected.png` — committed baseline
- `test-results/<spec>/<test>-diff.png` — pixel-difference overlay

CI uploads `playwright-report/` and `test-results/` as build artifacts on
failure (see workflow). Download them from the failed job to inspect diffs
locally.

## Determinism notes

Pixel-perfect comparisons are fragile by nature. We mitigate flake by:

- **Pinning a seed** — `e2e/visual/styleguide.spec.ts` injects
  `localStorage.setItem('sft.seed', '1')` before the page loads so all
  procedural generators (portraits, starfield, ambient FX) produce the same
  output every run.
- **Disabling animations** — Playwright's `animations: "disabled"` config
  freezes CSS transitions and re-runs are stable.
- **Forgiving thresholds** — `maxDiffPixelRatio: 0.02` and `threshold: 0.2`
  absorb sub-pixel font-rendering variance between machines (Linux CI vs.
  macOS dev) without masking real regressions.

If a baseline becomes flaky despite this, prefer narrowing the screenshot
region (`clip:` on `toHaveScreenshot`) over widening the threshold.
