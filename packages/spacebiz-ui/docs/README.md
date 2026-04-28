# @spacebiz/ui

Reusable Phaser 4 UI component library — theme-driven primitives, composites, and feedback widgets with no game-specific knowledge.

## Getting started

- [Getting started](./getting-started.md) — install, scaffold, first Button.
- [Theming](./theming.md) — `getTheme` / `setTheme`, `ThemeConfig` reference.

## Components by category

### Foundation

- [Theme](./components/Theme.md) — design tokens, color/font/spacing constants.
- [Layout](./components/Layout.md) — responsive layout metrics for HUD scenes.
- [DepthLayers](./components/DepthLayers.md) — render-order constants.
- [TextMetrics](./components/TextMetrics.md) — text measurement and ellipsis helpers.
- [MaskUtils](./components/MaskUtils.md) — Phaser 4 filter-mask helper.
- [UiSound](./components/UiSound.md) — pluggable SFX handler hook.
- [AmbientFX](./components/AmbientFX.md) — pulse, twinkle, float, rotate, screen flash.

### Primitives

- [Button](./components/Button.md) — primary clickable button with hover/disabled states.
- [Panel](./components/Panel.md) — glass-styled framed container with optional title bar.
- [Label](./components/Label.md) — themed text with optional glow.
- [IconButton](./components/IconButton.md) — compact icon-only nav/toolbar button.
- [Dropdown](./components/Dropdown.md) — single-select option picker.
- [ProgressBar](./components/ProgressBar.md) — animated progress bar with optional label.

### Composites

- [DataTable](./components/DataTable.md) — sortable, scrollable tabular data view.
- [ScrollFrame](./components/ScrollFrame.md) — single-purpose scrollable viewport.
- [ScrollableList](./components/ScrollableList.md) — vertical list with selection and keyboard nav.
- [TabGroup](./components/TabGroup.md) — tab bar with swap-on-click content panes.
- [StatRow](./components/StatRow.md) — label / dotted leader / value row.
- [InfoCard](./components/InfoCard.md) — title + stat rows + description card.

### Feedback

- [Modal](./components/Modal.md) — centered dialog with overlay and OK/Cancel buttons.
- [Tooltip](./components/Tooltip.md) — delayed hover tooltip attachable to any GameObject.
- [FloatingText](./components/FloatingText.md) — short-lived popup numbers and messages.
- [StatusBadge](./components/StatusBadge.md) — pill-shaped variant-styled status indicator.

### Layout (planned)

- HSizer, VSizer, GridSizer, FixWidthSizer, Anchor, ResizeHost (planned).

### Input (planned)

- Slider, Checkbox, Toggle, RadioGroup, Stepper, TextInput, ColorSwatch (planned).

### Notifications (planned)

- Toast, ConfirmDialog (planned).

### Misc (planned)

- Spinner, Accordion, ContextMenu, Toolbar (planned).

### Ambient

- [Starfield](./components/Starfield.md) — multi-layer parallax starfield with twinkle and shimmer.

### Utility

- [SceneUiDirector](./components/SceneUiDirector.md) — scoped UI layer manager with overlay support.

### Domain (will move to `@rogue-universe/shared`)

- [MilestoneOverlay](./components/MilestoneOverlay.md) — full-screen milestone announcement.
- [CargoIcons](./components/CargoIcons.md) — cargo-type icon textures and tints.
- [ShipIcons](./components/ShipIcons.md) — ship-class icon textures and tints.
