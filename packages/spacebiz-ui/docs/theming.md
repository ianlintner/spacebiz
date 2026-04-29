# Theming

`@spacebiz/ui` ships a small, runtime-swappable theme system. A theme is a
plain `ThemeConfig` object covering colors, typography, spacing and ambient
animation timings. Components read from the active theme via `getTheme()`;
swapping themes is a single `setTheme(nextTheme)` call.

## Variants

Three built-in variants are exported:

| Export                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `darkTheme`           | Sci-fi dark palette. The historical look of the project. |
| `lightTheme`          | Bright neutral surfaces with a blue accent.              |
| `highContrastTheme`   | Pure black/white with a yellow focus accent.             |
| `DEFAULT_THEME`       | Alias of `darkTheme` (preserves existing visuals).       |

All three share an identical `ThemeConfig` shape — a unit test enforces this so
that switching variants never produces a runtime "missing token" surprise.

```ts
import { setTheme, lightTheme } from "@spacebiz/ui";

setTheme(lightTheme);
```

## Semantic color tokens

Theme colors are exposed two ways:

1. **Semantic tokens** under `theme.color.*` — intent-bearing names
   (`surface.default`, `text.primary`, `border.focus`, `accent.danger`, etc.).
   **New components and migrations should prefer these.**
2. **Legacy flat palette** under `theme.colors.*` — the original field names
   (`text`, `textDim`, `accent`, `panelBg`, `headerBg`, …). Retained while the
   rest of the codebase migrates; do not delete.

### Token tree

```text
color
├── surface
│   ├── default     // panel / scene background
│   ├── raised      // header bars, cards
│   ├── sunken      // table even rows, scrollbar tracks
│   ├── hover       // row / button hover
│   ├── active      // pressed state
│   └── disabled    // disabled controls
├── text
│   ├── primary     // body copy
│   ├── secondary   // supporting copy
│   ├── muted       // captions, placeholder
│   ├── inverse     // text on accented surface
│   ├── link        // hyperlink-style
│   ├── danger      // loss / error
│   ├── success     // profit / confirm
│   └── warning     // caution
├── border
│   ├── default     // standard divider
│   ├── strong      // modal frame, emphasized card
│   ├── subtle      // faint divider
│   └── focus       // keyboard focus ring
└── accent
    ├── primary     // brand accent
    ├── secondary   // hover / alt accent
    ├── success
    ├── warning
    ├── danger
    └── info
```

### Migration guidance

When updating an existing component to use semantic tokens:

| Legacy                     | Semantic equivalent                 |
| -------------------------- | ----------------------------------- |
| `theme.colors.text`        | `theme.color.text.primary`          |
| `theme.colors.textDim`     | `theme.color.text.muted`            |
| `theme.colors.accent`      | `theme.color.accent.primary`        |
| `theme.colors.accentHover` | `theme.color.accent.secondary`      |
| `theme.colors.headerBg`    | `theme.color.surface.raised`        |
| `theme.colors.panelBg`     | `theme.color.surface.default`       |
| `theme.colors.rowEven`     | `theme.color.surface.sunken`        |
| `theme.colors.rowHover`    | `theme.color.surface.hover`         |
| `theme.colors.profit`      | `theme.color.text.success` / `accent.success` |
| `theme.colors.loss`        | `theme.color.text.danger`  / `accent.danger`  |
| `theme.colors.warning`     | `theme.color.text.warning` / `accent.warning` |
| `theme.colors.panelBorder` | `theme.color.border.default`        |

The `darkTheme` variant maps every semantic token to the matching legacy
color, so migrating a component is a no-op for the dark theme but
automatically picks up correct values for `lightTheme` /
`highContrastTheme`.

### Pilot migrations

The semantic token API is currently used by:

- `Button.ts`
- `Panel.ts`
- `Modal.ts`

Other components still read from the legacy `colors` map and will be
migrated incrementally.

## Adding a new variant

1. Build a `legacyColors` map covering every field of `ThemeConfig['colors']`.
2. Build a `SemanticColorTokens` value covering every group in
   `ThemeConfig['color']`.
3. Compose the variant:
   ```ts
   export const myTheme: ThemeConfig = {
     color: MY_SEMANTIC_COLORS,
     colors: { ...MY_LEGACY_COLORS },
     ...SHARED_TYPOGRAPHY, // optional — copy from Theme.ts if you want
                            // different fonts/spacing/ambient timings
   };
   ```
4. Add a unit test that mounts the theme via `setTheme(myTheme)` and renders
   the components you care about, or extend `ThemeVariants.test.ts` to cover
   it.

## Future work

- Migrate remaining components (`DataTable`, `Dropdown`, `ScrollableList`,
  `TabGroup`, `Label`, `ProgressBar`, etc.) off the legacy `colors` map.
- Add an `overlay` semantic group (currently `colors.modalOverlay` is read
  directly because no semantic equivalent exists yet).
- Once all callers are migrated, drop the legacy `colors` map.
