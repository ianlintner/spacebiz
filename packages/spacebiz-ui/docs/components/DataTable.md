# DataTable

Sortable, scrollable tabular data view with column-driven formatting, optional cell/header icons, keyboard navigation, row tooltips, and a `contentSized` mode for nesting inside [ScrollFrame](./ScrollFrame.md).

## Import

```ts
import { DataTable } from "@spacebiz/ui";
import type { DataTableConfig, ColumnDef } from "@spacebiz/ui";
```

## Quick example

```ts
const table = new DataTable(this, {
  x: 40,
  y: 80,
  width: 720,
  height: 360,
  columns: [
    { key: "name", label: "Ship", width: 200, sortable: true },
    { key: "fuel", label: "Fuel", width: 80, align: "right" },
    { key: "status", label: "Status", width: 120 },
  ],
  onRowSelect: (i, row) => console.log("selected", row),
});
table.setRows([
  { name: "Aurora", fuel: 92, status: "Idle" },
  { name: "Caliban", fuel: 18, status: "Refueling" },
]);
```

## Config

| Field                | Type                          | Default                  | Description                                                                |
| -------------------- | ----------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `x`                  | `number`                      | —                        | X position.                                                                |
| `y`                  | `number`                      | —                        | Y position.                                                                |
| `width`              | `number`                      | —                        | Total table width.                                                         |
| `height`             | `number`                      | —                        | Table height (max in `contentSized` mode).                                 |
| `columns`            | `ColumnDef[]`                 | —                        | Column definitions; widths scale to fill `width`.                          |
| `onRowSelect`        | `(rowIndex, rowData) => void` | —                        | Fires on click and keyboard arrow.                                         |
| `onRowActivate`      | `(rowIndex, rowData) => void` | —                        | Fires on Enter/Space when keyboard nav is enabled.                         |
| `onCancel`           | `() => void`                  | —                        | Fires on Escape when keyboard nav is enabled.                              |
| `keyboardNavigation` | `boolean`                     | `false`                  | Enable arrow/Enter/Escape/PageUp/PageDown navigation.                      |
| `autoFocus`          | `boolean`                     | `false`                  | Auto-focus the table on creation; selects row 0.                           |
| `emptyStateText`     | `string`                      | `"No entries available"` | Empty-state title.                                                         |
| `emptyStateHint`     | `string`                      | —                        | Empty-state hint line.                                                     |
| `rowAlphaFn`         | `(row) => number`             | `() => 0.95`             | Per-row alpha; return < 1 to dim unavailable rows.                         |
| `rowTooltipFn`       | `(row) => string \| null`     | —                        | Return a tooltip string or null per row.                                   |
| `contentSized`       | `boolean`                     | `false`                  | Render at natural height (for nesting in [ScrollFrame](./ScrollFrame.md)). |

`ColumnDef`:

| Field            | Type                             | Default      | Description                                    |
| ---------------- | -------------------------------- | ------------ | ---------------------------------------------- |
| `key`            | `string`                         | —            | Row property key for the cell value.           |
| `label`          | `string`                         | —            | Header text.                                   |
| `width`          | `number`                         | —            | Relative width (rescaled to fill table width). |
| `align`          | `"left" \| "center" \| "right"`  | `"left"`     | Cell alignment.                                |
| `sortable`       | `boolean`                        | `false`      | Click header to toggle sort.                   |
| `format`         | `(value) => string`              | `String(v)`  | Format raw value for display.                  |
| `colorFn`        | `(value) => number \| null`      | —            | Per-cell text color.                           |
| `headerIcon`     | `string`                         | —            | Texture key shown left of header label.        |
| `headerIconTint` | `number`                         | accent       | Tint for header icon.                          |
| `iconFn`         | `(value, row) => string \| null` | —            | Texture key for an inline cell icon.           |
| `iconTintFn`     | `(value, row) => number \| null` | text/colorFn | Tint for cell icon.                            |

## Methods

| Method                | Signature                                   | Description                                           |
| --------------------- | ------------------------------------------- | ----------------------------------------------------- |
| `setRows`             | `(rows: Record<string, unknown>[]) => void` | Replace all rows; resets scroll, preserves selection. |
| `setEmptyState`       | `(text?: string, hint?: string) => void`    | Override the empty-state copy at runtime.             |
| `getSelectedRowIndex` | `() => number`                              | Currently selected index, or `-1`.                    |
| `getSelectedRow`      | `() => Record<string, unknown> \| null`     | Currently selected row data.                          |
| `contentHeight`       | getter `number`                             | Natural rendered height (used by ScrollFrame).        |

## Events

In `contentSized` mode, the table emits on itself:

| Event            | Payload                           | Description                                      |
| ---------------- | --------------------------------- | ------------------------------------------------ |
| `contentResize`  | `{ height: number }`              | After `setRows` recalculates content height.     |
| `scrollIntoView` | `{ top: number; height: number }` | Asks parent to scroll a content range into view. |

[ScrollFrame.setContent](./ScrollFrame.md) auto-wires both. Plays `ui_row_select` and `ui_tab_switch` via [UiSound](./UiSound.md).

## Theming

Reads `theme.colors.{headerBg,accent,rowEven,rowOdd,rowHover,text,textDim,panelBorder,panelBg}`, `theme.fonts.{body,caption}`, `theme.spacing.{xs,sm}`.

## See also

- [ScrollFrame](./ScrollFrame.md)
- [ScrollableList](./ScrollableList.md)
- [TabGroup](./TabGroup.md)
