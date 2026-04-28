# CargoIcons

> Domain helpers — slated to move to `@rogue-universe/shared`. Documented here while they live in `@spacebiz/ui`.

Cargo type icon mappings — texture keys, tint colors, and display labels for the seven commodity types in Star Freight Tycoon. Icons are 24×24 white-on-transparent CanvasTextures generated at boot time.

## Import

```ts
import {
  generateCargoIcons,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
  getCargoShortLabel,
  CARGO_COLORS,
  CARGO_LABELS,
  CARGO_SHORT_LABELS,
  CARGO_ICON_PREFIX,
  CARGO_TYPE_LIST,
} from "@spacebiz/ui";
import type { CargoTypeValue } from "@spacebiz/ui";
```

## Quick example

```ts
// In BootScene.create():
generateCargoIcons(this.textures);

// Elsewhere:
const sprite = this.add.image(x, y, getCargoIconKey("food"));
sprite.setTint(getCargoColor("food"));
```

## Constants

| Name                 | Type                             | Description                                   |
| -------------------- | -------------------------------- | --------------------------------------------- |
| `CARGO_TYPE_LIST`    | `readonly [...]`                 | Ordered list of seven cargo type values.      |
| `CARGO_COLORS`       | `Record<CargoTypeValue, number>` | Per-type tint color.                          |
| `CARGO_LABELS`       | `Record<CargoTypeValue, string>` | Full display label.                           |
| `CARGO_SHORT_LABELS` | `Record<CargoTypeValue, string>` | Compact 3–4 letter label (PAX, RAW, FOOD, …). |
| `CARGO_ICON_PREFIX`  | `"cargo-"`                       | Texture key prefix.                           |

`CargoTypeValue` is the union `"passengers" | "rawMaterials" | "food" | "technology" | "luxury" | "hazmat" | "medical"`.

## Methods

| Method               | Signature                                            | Description                                          |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `generateCargoIcons` | `(textures: Phaser.Textures.TextureManager) => void` | Generate all 7 CanvasTextures. Call once at boot.    |
| `getCargoIconKey`    | `(cargoType: string) => string`                      | `cargo-<cargoType>`.                                 |
| `getCargoColor`      | `(cargoType: string) => number`                      | Tint color (accent cyan for unknown).                |
| `getCargoLabel`      | `(cargoType: string) => string`                      | Full label (capitalised fallback for unknown).       |
| `getCargoShortLabel` | `(cargoType: string) => string`                      | Compact label (uppercase first 4 chars for unknown). |

## Events

None.

## Theming

Independent of theme; tint colors are baked per cargo type.

## See also

- [ShipIcons](./ShipIcons.md)
