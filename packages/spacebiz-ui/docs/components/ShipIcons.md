# ShipIcons

> Domain helpers — slated to move to `@rogue-universe/shared`. Documented here while they live in `@spacebiz/ui`.

Ship class icon mappings — texture keys, tint colors, and display labels for the thirteen ship classes in Star Freight Tycoon. Icons are 24×24 white-on-transparent CanvasTextures generated at boot time.

## Import

```ts
import {
  generateShipIcons,
  getShipIconKey,
  getShipColor,
  getShipLabel,
  SHIP_COLORS,
  SHIP_LABELS,
  SHIP_ICON_PREFIX,
  SHIP_CLASS_LIST,
} from "@spacebiz/ui";
import type { ShipClassValue } from "@spacebiz/ui";
```

## Quick example

```ts
// In BootScene.create():
generateShipIcons(this.textures);

// Elsewhere:
const sprite = this.add.image(x, y, getShipIconKey("starLiner"));
sprite.setTint(getShipColor("starLiner"));
```

## Constants

| Name               | Type                             | Description                            |
| ------------------ | -------------------------------- | -------------------------------------- |
| `SHIP_CLASS_LIST`  | `readonly [...]`                 | Ordered list of all ship class values. |
| `SHIP_COLORS`      | `Record<ShipClassValue, number>` | Per-class tint color.                  |
| `SHIP_LABELS`      | `Record<ShipClassValue, string>` | Display label per class.               |
| `SHIP_ICON_PREFIX` | `"ship-"`                        | Texture key prefix.                    |

`ShipClassValue` covers: `cargoShuttle`, `passengerShuttle`, `mixedHauler`, `fastCourier`, `bulkFreighter`, `starLiner`, `megaHauler`, `luxuryLiner`, `tug`, `refrigeratedHauler`, `armoredFreighter`, `diplomaticYacht`, `colonyShip`.

## Methods

| Method              | Signature                                            | Description                                       |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `generateShipIcons` | `(textures: Phaser.Textures.TextureManager) => void` | Generate all CanvasTextures. Call once at boot.   |
| `getShipIconKey`    | `(shipClass: string) => string`                      | `ship-<shipClass>`.                               |
| `getShipColor`      | `(shipClass: string) => number`                      | Tint color (accent cyan for unknown).             |
| `getShipLabel`      | `(shipClass: string) => string`                      | Display label (capitalised fallback for unknown). |

## Events

None.

## Theming

Independent of theme; tint colors are baked per ship class.

## See also

- [CargoIcons](./CargoIcons.md)
