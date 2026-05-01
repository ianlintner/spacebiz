import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import {
  HUB_GRID_DECKS,
  HUB_GRID_SLOTS_PER_DECK,
  HUB_ROOM_DEFINITIONS,
} from "../data/constants.ts";
import type { HubRoom, HubRoomType } from "../data/types.ts";

/**
 * Color palette for each room type. Mirrors the lookup that lived inline in
 * `StationBuilderScene` before this widget was lifted out — kept here so the
 * grid is self-contained.
 */
export const ROOM_COLORS: Record<string, number> = {
  simpleTerminal: 0x00eeff,
  improvedTerminal: 0x00ccff,
  advancedTerminal: 0x00aaff,
  tradeOffice: 0x00ccaa,
  passengerLounge: 0xaa66ff,
  oreProcessing: 0xcc8844,
  foodTerminal: 0x66cc44,
  techTerminal: 0x44ddff,
  luxuryTerminal: 0xffcc00,
  hazmatTerminal: 0xff6644,
  medicalTerminal: 0xff66aa,
  fuelDepot: 0x44aaff,
  marketExchange: 0xffcc00,
  customsBureau: 0x88cc44,
  repairBay: 0xff4488,
  researchLab: 0x44ddff,
  cargoWarehouse: 0xcc8844,
  securityOffice: 0xdd4444,
};

const CELL_GAP = 4;

export interface StationBuilderGridConfig {
  /** World-space top-left X of the grid container. */
  x: number;
  /** World-space top-left Y of the grid container. */
  y: number;
  /** Outer width allocated to the grid. Cell pixel width is derived from `width / cols`. */
  width: number;
  /** Outer height allocated to the grid. Cell pixel height is derived from `height / rows`. */
  height: number;
  /** Columns (slots per deck). Defaults to `HUB_GRID_SLOTS_PER_DECK`. */
  cols?: number;
  /** Rows (decks). Defaults to `HUB_GRID_DECKS`. */
  rows?: number;
}

export interface StationBuilderGridData {
  rooms: HubRoom[];
  /** How many of `cols * rows` slots are unlocked at the current hub level. */
  maxSlots: number;
}

export interface CellEventPayload {
  gx: number;
  gy: number;
  room: HubRoom | null;
  pointer?: Phaser.Input.Pointer;
}

/**
 * Self-contained placement grid for the station builder. Owns its cell
 * graphics, occupant room cards, hover highlights and drag-drop hit testing.
 *
 * The scene drives this widget by calling `setData(...)` after every game-state
 * mutation (build / demolish / upgrade / hub-level change). Resizing on window
 * resize is `setSize(width, height)` — no scene restart required.
 *
 * Events emitted on `this`:
 *   - `'cell:click'`  ({ gx, gy, room, pointer })
 *   - `'cell:hover'`  ({ gx, gy, room })  // pointerover, fired once per enter
 */
export class StationBuilderGrid extends Phaser.GameObjects.Container {
  private readonly cols: number;
  private readonly rows: number;
  private gridWidth: number;
  private gridHeight: number;

  private rooms: HubRoom[] = [];
  private maxSlots = 0;
  private dragRoomType: HubRoomType | null = null;

  private cellNodes: Phaser.GameObjects.Rectangle[][] = [];
  private decorations: Phaser.GameObjects.GameObject[] = [];

  /**
   * World-space hit bounds for each playable (non-locked) cell. Maintained in
   * sync with cellNodes so drag-drop hit tests don't need a full traversal.
   */
  private slotBounds: Array<{
    gx: number;
    gy: number;
    bounds: Phaser.Geom.Rectangle;
    occupied: boolean;
    locked: boolean;
  }> = [];

  constructor(scene: Phaser.Scene, config: StationBuilderGridConfig) {
    super(scene, config.x, config.y);
    this.cols = config.cols ?? HUB_GRID_SLOTS_PER_DECK;
    this.rows = config.rows ?? HUB_GRID_DECKS;
    this.gridWidth = config.width;
    this.gridHeight = config.height;
    super.setSize(this.gridWidth, this.gridHeight);
    scene.add.existing(this);
  }

  /**
   * Cell pixel size derived from the current outer dimensions. Cells are
   * separated by `CELL_GAP` px so the inner area is `(N - 1) * GAP` smaller
   * than the outer.
   */
  private getCellMetrics(): { cellW: number; cellH: number } {
    const cellW = (this.gridWidth - (this.cols - 1) * CELL_GAP) / this.cols;
    const cellH = (this.gridHeight - (this.rows - 1) * CELL_GAP) / this.rows;
    return { cellW, cellH };
  }

  /**
   * Resize the grid in place. Calls `super.setSize` so Phaser's hit-area
   * tracking stays consistent, then rebuilds cell graphics at the new
   * dimensions. The placed-rooms data is preserved.
   */
  public setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.gridWidth = width;
    this.gridHeight = height;
    this.rebuild();
    return this;
  }

  /**
   * Replace the placed rooms + slot count and rebuild. Use this after every
   * gameplay action (build / demolish / upgrade) instead of restarting the
   * scene. Named `setRooms` rather than `setData` to avoid colliding with
   * `Phaser.GameObjects.Container.setData(key, value)` which is the engine's
   * generic data-manager API.
   */
  public setRooms(data: StationBuilderGridData): this {
    this.rooms = data.rooms;
    this.maxSlots = data.maxSlots;
    this.rebuild();
    return this;
  }

  /**
   * Tell the grid that the user is mid-drag with `roomType` as the candidate
   * placement. Pass `null` to clear. The grid uses this to decide which cells
   * should highlight on `updateDragHighlight`.
   */
  public setSelectedTool(roomType: HubRoomType | null): this {
    this.dragRoomType = roomType;
    return this;
  }

  /** Convenience accessor for tests / callers that need to know the cell size. */
  public getCellSize(): { cellW: number; cellH: number } {
    return this.getCellMetrics();
  }

  /**
   * Update drop-target highlighting during a drag. `worldX/worldY` are pointer
   * world coordinates. The cell directly under the pointer (if valid) gets the
   * accent stroke; all other cells reset to the panel border.
   */
  public updateDragHighlight(worldX: number, worldY: number): void {
    const target = this.getDropCell(worldX, worldY);
    const theme = getTheme();
    for (const slot of this.slotBounds) {
      if (slot.locked || slot.occupied) continue;
      const cell = this.cellNodes[slot.gy]?.[slot.gx];
      if (!cell) continue;
      if (target && target.gx === slot.gx && target.gy === slot.gy) {
        cell.setStrokeStyle(2, theme.colors.accent);
      } else {
        cell.setStrokeStyle(1, theme.colors.panelBorder);
      }
    }
  }

  /** Reset every playable cell's stroke to the default panel border. */
  public clearDragHighlight(): void {
    const theme = getTheme();
    for (const slot of this.slotBounds) {
      if (slot.locked || slot.occupied) continue;
      const cell = this.cellNodes[slot.gy]?.[slot.gx];
      if (cell) cell.setStrokeStyle(1, theme.colors.panelBorder);
    }
  }

  /**
   * Hit-test a world coordinate against playable empty cells. Returns the
   * grid coordinates of the cell under the point, or null. Locked or occupied
   * cells are not valid drop targets.
   */
  public getDropCell(
    worldX: number,
    worldY: number,
  ): { gx: number; gy: number } | null {
    for (const slot of this.slotBounds) {
      if (slot.locked || slot.occupied) continue;
      if (slot.bounds.contains(worldX, worldY)) {
        return { gx: slot.gx, gy: slot.gy };
      }
    }
    return null;
  }

  // ── internals ──────────────────────────────────────────────────────────

  /**
   * Tear down all cell graphics + decorations and rebuild from the current
   * `(gridWidth, gridHeight, rooms, maxSlots)` snapshot. This is the only
   * mutation path — `setSize` and `setData` both delegate to it.
   */
  private rebuild(): void {
    // Destroy previous children so we can recreate at fresh dimensions.
    for (const row of this.cellNodes) {
      for (const cell of row) cell.destroy();
    }
    for (const obj of this.decorations) obj.destroy();
    this.cellNodes = [];
    this.decorations = [];
    this.slotBounds = [];

    const theme = getTheme();
    const { cellW, cellH } = this.getCellMetrics();
    let slotIndex = 0;

    for (let gy = 0; gy < this.rows; gy++) {
      this.cellNodes[gy] = [];
      for (let gx = 0; gx < this.cols; gx++) {
        // Local-space center inside this Container.
        const cx = gx * (cellW + CELL_GAP) + cellW / 2;
        const cy = gy * (cellH + CELL_GAP) + cellH / 2;
        const locked = slotIndex >= this.maxSlots;
        const room = this.rooms.find((r) => r.gridX === gx && r.gridY === gy);

        let fillColor = theme.colors.panelBg;
        let fillAlpha = 0.4;
        if (locked) {
          fillColor = 0x222222;
          fillAlpha = 0.6;
        } else if (room) {
          fillColor = ROOM_COLORS[room.type] ?? 0x555555;
          fillAlpha = 0.26;
        }

        const cell = this.scene.add
          .rectangle(cx, cy, cellW, cellH, fillColor, fillAlpha)
          .setStrokeStyle(1, locked ? 0x333333 : theme.colors.panelBorder);
        this.add(cell);
        this.cellNodes[gy][gx] = cell;

        if (room) {
          this.addRoomCard(cx, cy, cellW, cellH, room.type);
          this.attachOccupiedHandlers(cell, gx, gy, room);
        } else if (!locked) {
          this.attachEmptyHandlers(cell, gx, gy);
        }

        if (locked) {
          const lockText = this.scene.add
            .text(cx, cy, "🔒", { fontSize: "12px", align: "center" })
            .setOrigin(0.5, 0.5)
            .setAlpha(0.5);
          this.add(lockText);
          this.decorations.push(lockText);
        }

        // World-space bounds for drag-drop hit testing.
        this.slotBounds.push({
          gx,
          gy,
          bounds: new Phaser.Geom.Rectangle(
            this.x + cx - cellW / 2,
            this.y + cy - cellH / 2,
            cellW,
            cellH,
          ),
          occupied: !!room,
          locked,
        });

        slotIndex++;
      }
    }
  }

  private addRoomCard(
    cx: number,
    cy: number,
    cellW: number,
    cellH: number,
    roomType: HubRoomType,
  ): void {
    const theme = getTheme();
    const def = HUB_ROOM_DEFINITIONS[roomType];
    const roomColor = ROOM_COLORS[roomType] ?? 0x555555;

    const bg = this.scene.add
      .rectangle(cx, cy, cellW, cellH, roomColor, 0.22)
      .setStrokeStyle(1, roomColor);
    const iconText = this.scene.add
      .text(cx - cellW / 2 + 10, cy - cellH / 2 + 8, def.icon, {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0, 0);
    const nameText = this.scene.add
      .text(cx - cellW / 2 + 24, cy - cellH / 2 + 8, def.name, {
        fontSize: "9px",
        fontFamily: theme.fonts.caption.family,
        color: "#ffffff",
        align: "left",
        wordWrap: { width: cellW - 30 },
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: "#000000",
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0, 0);

    this.add(bg);
    this.add(iconText);
    this.add(nameText);
    this.decorations.push(bg, iconText, nameText);
  }

  private attachOccupiedHandlers(
    cell: Phaser.GameObjects.Rectangle,
    gx: number,
    gy: number,
    room: HubRoom,
  ): void {
    const theme = getTheme();
    cell.setInteractive({ useHandCursor: true });
    cell.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      this.emit("cell:click", { gx, gy, room, pointer });
    });
    cell.on("pointerover", () => {
      cell.setStrokeStyle(2, ROOM_COLORS[room.type] ?? theme.colors.accent);
      this.emit("cell:hover", { gx, gy, room });
    });
    cell.on("pointerout", () => {
      cell.setStrokeStyle(1, theme.colors.panelBorder);
    });
  }

  private attachEmptyHandlers(
    cell: Phaser.GameObjects.Rectangle,
    gx: number,
    gy: number,
  ): void {
    const theme = getTheme();
    cell.setInteractive({ useHandCursor: true });
    cell.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      this.emit("cell:click", { gx, gy, room: null, pointer });
    });
    cell.on("pointerover", () => {
      if (this.dragRoomType) {
        cell.setStrokeStyle(2, theme.colors.accent);
      }
      this.emit("cell:hover", { gx, gy, room: null });
    });
    cell.on("pointerout", () => {
      cell.setStrokeStyle(1, theme.colors.panelBorder);
    });
  }
}
