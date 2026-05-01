import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { HubRoom, HubRoomType, StationHub } from "../data/types.ts";
import {
  getTheme,
  colorToString,
  Panel,
  Button,
  PortraitPanel,
  createStarfield,
  getLayout,
  Label,
  Modal,
  attachReflowHandler,
} from "../ui/index.ts";
import {
  HUB_ROOM_DEFINITIONS,
  HUB_UPGRADE_COSTS,
  HUB_LEVEL_SLOTS,
  HUB_MAX_LEVEL,
  HUB_GRID_DECKS,
  HUB_GRID_SLOTS_PER_DECK,
  HUB_DEMOLISH_REFUND_RATIO,
  HUB_UPGRADE_ONLY_ROOMS,
} from "../data/constants.ts";
import {
  canBuildRoom,
  buildRoom,
  demolishRoom,
  upgradeHub,
  getAvailableSlots,
  getHubUpkeep,
  isTerminalRoom,
  getTerminalUpgrade,
  upgradeTerminal,
} from "../game/hub/HubManager.ts";
import { getRoomPortraitTextureKey } from "../data/roomPortraits.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

/** Color each room type consistently */
const ROOM_COLORS: Record<string, number> = {
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

/** Deterministic seed for procedural portraits per room type */
function roomPortraitSeed(roomType: string): number {
  let hash = 0;
  for (let i = 0; i < roomType.length; i++) {
    hash = (hash * 31 + roomType.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Format a bonus effect type + value for display */
function formatEffect(type: string, value: number): string {
  const pct = (v: number) => {
    const sign = v >= 0 ? "+" : "";
    return `${sign}${Math.round(v * 100)}%`;
  };
  switch (type) {
    case "modifyLicenseFee":
      return `License fees ${pct(value)}`;
    case "modifyPassengerRevenue":
      return `Passenger revenue ${pct(value)}`;
    case "addRouteSlots":
      return `+${value} route slot${value !== 1 ? "s" : ""}`;
    case "modifyFuel":
      return `Fuel costs ${pct(value)}`;
    case "modifyRevenue":
      return `Trade revenue ${pct(value)}`;
    case "modifyTariff":
      return `Tariff rates ${pct(value)}`;
    case "addRepairPerTurn":
      return `+${value} repair/turn`;
    case "addRPPerTurn":
      return `+${value} RP/turn`;
    case "modifySaturation":
      return `Saturation impact ${pct(value)}`;
    case "modifyAIRevenue":
      return `AI revenue ${pct(value)}`;
    case "modifyAIMaintenance":
      return `AI maintenance ${pct(value)}`;
    default:
      return `${type}: ${value}`;
  }
}

const GRID_PANEL_HEIGHT = 220;
const PALETTE_PANEL_HEIGHT = 160;
const PANEL_GAP = 8;

export class StationBuilderScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private selectedRoomType: HubRoomType | null = null;
  private selectedRoomId: string | null = null;
  private gridCells: Phaser.GameObjects.Rectangle[][] = [];
  private roomCardWidth = 110;
  private roomCardHeight = 50;
  private gridPanel!: Panel;
  private palettePanel!: Panel;
  private infoPanel!: Panel;
  private infoContent!: { x: number; y: number; width: number; height: number };
  private infoElements: Phaser.GameObjects.GameObject[] = [];
  private dragGhost: Phaser.GameObjects.Container | null = null;
  private dragRoomType: HubRoomType | null = null;
  private gridSlotBounds: Array<{
    gx: number;
    gy: number;
    bounds: Phaser.Geom.Rectangle;
    valid: boolean;
  }> = [];
  private handlePointerMove = (p: Phaser.Input.Pointer): void => {
    this.onDragMove(p);
  };

  private handlePointerUp = (p: Phaser.Input.Pointer): void => {
    this.onDragEnd(p);
  };

  constructor() {
    super({ key: "StationBuilderScene" });
  }

  create(): void {
    const L = getLayout();
    this.selectedRoomType = null;
    this.selectedRoomId = null;
    this.infoElements = [];
    this.dragGhost = null;
    this.dragRoomType = null;
    this.gridSlotBounds = [];

    createStarfield(this);

    const state = gameStore.getState();
    const hub = state.stationHub;

    // ── Sidebar Portrait ──
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.showHubPortrait(hub);

    // ── Grid Panel (top of main content) ──
    const gridH = GRID_PANEL_HEIGHT;
    this.gridPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: gridH,
      title: hub
        ? `Station Grid — Level ${hub.level} (${hub.rooms.length}/${HUB_LEVEL_SLOTS[hub.level]} slots)`
        : "No Hub Station",
    });

    const gridMetrics = this.getGridMetrics();
    this.roomCardWidth = Math.floor(gridMetrics.cellW);
    this.roomCardHeight = Math.floor(gridMetrics.cellH);

    if (hub) {
      this.buildGrid(hub);
    }

    // ── Room Palette / Build Panel (middle) ──
    const paletteY = L.contentTop + gridH + PANEL_GAP;
    const paletteH = PALETTE_PANEL_HEIGHT;
    this.palettePanel = new Panel(this, {
      x: L.mainContentLeft,
      y: paletteY,
      width: L.mainContentWidth,
      height: paletteH,
      title: "Available Rooms",
    });

    if (hub) {
      const paletteContent = this.palettePanel.getContentArea();
      const completedTechIds = state.tech.completedTechIds;
      // Filter out upgrade-only rooms (Improved/Advanced Terminal)
      const roomTypes = hub.availableRoomTypes.filter(
        (rt) => !HUB_UPGRADE_ONLY_ROOMS.includes(rt),
      );
      let col = 0;
      let row = 0;
      const btnW = this.roomCardWidth;
      const btnH = this.roomCardHeight;
      const gap = 6;
      const cols = Math.max(1, Math.floor(paletteContent.width / (btnW + gap)));

      for (const rt of roomTypes) {
        const check = canBuildRoom(hub, rt, completedTechIds, state.cash);

        const bx = paletteContent.x + col * (btnW + gap) + btnW / 2;
        const by = paletteContent.y + row * (btnH + gap) + btnH / 2;

        const card = this.createRoomCardVisual({
          x: bx,
          y: by,
          width: btnW,
          height: btnH,
          roomType: rt,
          enabled: check.canBuild,
          showCost: true,
          selected: this.selectedRoomType === rt,
          interactive: true,
        });
        const { bg } = card;
        this.palettePanel.add(bg);
        this.palettePanel.add(card.iconText);
        this.palettePanel.add(card.nameText);
        if (card.costText) {
          this.palettePanel.add(card.costText);
        }

        bg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (check.canBuild) {
            this.selectedRoomType = rt;
            this.selectedRoomId = null;
            this.showRoomInfo(rt);
            this.startDrag(rt, pointer);
          }
        });

        bg.on("pointerover", () => {
          bg.setFillStyle(card.roomColor, 0.45);
          this.showRoomInfo(rt);
        });
        bg.on("pointerout", () => {
          bg.setFillStyle(
            card.roomColor,
            this.selectedRoomType === rt ? 0.5 : 0.22,
          );
        });

        col++;
        if (col >= cols) {
          col = 0;
          row++;
        }
      }
    }

    // ── Info / Action Panel (bottom) ──
    const infoY = paletteY + paletteH + PANEL_GAP;
    const infoH = L.contentHeight - gridH - paletteH - PANEL_GAP * 2;
    this.infoPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: infoY,
      width: L.mainContentWidth,
      height: Math.max(infoH, 120),
      title: "Actions",
    });
    this.infoContent = this.infoPanel.getContentArea();

    this.showDefaultInfo(hub, state.cash);

    // Scene-level drag listeners (de-duplicated across restarts)
    this.input.off("pointermove", this.handlePointerMove);
    this.input.off("pointerup", this.handlePointerUp);
    this.input.on("pointermove", this.handlePointerMove);
    this.input.on("pointerup", this.handlePointerUp);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointermove", this.handlePointerMove);
      this.input.off("pointerup", this.handlePointerUp);
    });

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  /**
   * Reflow panel positions/sizes on resize.
   *
   * The grid cells, palette cards, and info-panel children are built procedurally
   * inside the panels and don't have a `setSize` path — we resize the outer
   * panels here, but the inner content stays at its initial layout until the
   * scene is restarted (e.g. after a build/demolish/upgrade action).
   *
   * TODO(setSize): station-builder grid — extract grid/palette/info rebuild
   * into reusable repositioning helpers so resize live-updates the inner cells.
   */
  private relayout(): void {
    const L = getLayout();

    // PortraitPanel: setPosition before setSize.
    this.portrait.setPosition(L.sidebarLeft, L.contentTop);
    this.portrait.setSize(L.sidebarWidth, L.contentHeight);

    // Grid panel.
    this.gridPanel.setPosition(L.mainContentLeft, L.contentTop);
    this.gridPanel.setSize(L.mainContentWidth, GRID_PANEL_HEIGHT);

    // Palette panel.
    const paletteY = L.contentTop + GRID_PANEL_HEIGHT + PANEL_GAP;
    this.palettePanel.setPosition(L.mainContentLeft, paletteY);
    this.palettePanel.setSize(L.mainContentWidth, PALETTE_PANEL_HEIGHT);

    // Info panel.
    const infoY = paletteY + PALETTE_PANEL_HEIGHT + PANEL_GAP;
    const infoH =
      L.contentHeight -
      GRID_PANEL_HEIGHT -
      PALETTE_PANEL_HEIGHT -
      PANEL_GAP * 2;
    this.infoPanel.setPosition(L.mainContentLeft, infoY);
    this.infoPanel.setSize(L.mainContentWidth, Math.max(infoH, 120));

    // Re-read content area after panel resize.
    this.infoContent = this.infoPanel.getContentArea();
  }

  // ── Grid rendering ──

  private buildGrid(hub: StationHub): void {
    const theme = getTheme();
    const { content, cellW, cellH } = this.getGridMetrics();
    const maxSlots = HUB_LEVEL_SLOTS[hub.level];

    this.gridCells = [];
    let slotIndex = 0;
    for (let gy = 0; gy < HUB_GRID_DECKS; gy++) {
      this.gridCells[gy] = [];
      for (let gx = 0; gx < HUB_GRID_SLOTS_PER_DECK; gx++) {
        const cx = content.x + gx * (cellW + 4) + cellW / 2;
        const cy = content.y + gy * (cellH + 4) + cellH / 2;
        const locked = slotIndex >= maxSlots;
        const room = hub.rooms.find((r) => r.gridX === gx && r.gridY === gy);

        let fillColor = theme.colors.panelBg;
        let fillAlpha = 0.4;
        if (locked) {
          fillColor = 0x222222;
          fillAlpha = 0.6;
        } else if (room) {
          fillColor = ROOM_COLORS[room.type] ?? 0x555555;
          fillAlpha = 0.26;
        }

        const cell = this.add
          .rectangle(cx, cy, cellW, cellH, fillColor, fillAlpha)
          .setStrokeStyle(1, locked ? 0x333333 : theme.colors.panelBorder);
        this.gridPanel.add(cell);
        this.gridCells[gy][gx] = cell;

        if (room) {
          const card = this.createRoomCardVisual({
            x: cx,
            y: cy,
            width: cellW,
            height: cellH,
            roomType: room.type,
            enabled: true,
            showCost: false,
            selected: false,
          });
          this.gridPanel.add(card.bg);
          this.gridPanel.add(card.iconText);
          this.gridPanel.add(card.nameText);

          cell.setInteractive({ useHandCursor: true });
          cell.on("pointerup", () => {
            if (this.dragGhost) return;
            this.selectedRoomType = null;
            this.selectedRoomId = room.id;
            this.showBuiltRoomInfo(hub, room);
          });

          cell.on("pointerover", () => {
            cell.setStrokeStyle(
              2,
              ROOM_COLORS[room.type] ?? theme.colors.accent,
            );
          });
          cell.on("pointerout", () => {
            cell.setStrokeStyle(1, theme.colors.panelBorder);
          });
        } else if (!locked) {
          cell.setInteractive({ useHandCursor: true });
          cell.on("pointerup", () => {
            if (this.dragGhost) return;
            this.handleGridClick(gx, gy);
          });
          cell.on("pointerover", () => {
            if (this.selectedRoomType) {
              cell.setStrokeStyle(2, theme.colors.accent);
            }
          });
          cell.on("pointerout", () => {
            cell.setStrokeStyle(1, theme.colors.panelBorder);
          });
        }

        // Locked overlay text
        if (locked) {
          const lockText = this.add
            .text(cx, cy, "🔒", {
              fontSize: "12px",
              align: "center",
            })
            .setOrigin(0.5, 0.5)
            .setAlpha(0.5);
          this.gridPanel.add(lockText);
        }

        // Store world bounds for drag-drop hit testing
        this.gridSlotBounds.push({
          gx,
          gy,
          bounds: new Phaser.Geom.Rectangle(
            this.gridPanel.x + cx - cellW / 2,
            this.gridPanel.y + cy - cellH / 2,
            cellW,
            cellH,
          ),
          valid: !locked && !room,
        });

        slotIndex++;
      }
    }
  }

  private handleGridClick(gx: number, gy: number): void {
    if (this.selectedRoomId) {
      // Demolish the selected room
      this.confirmDemolish();
      return;
    }
    if (!this.selectedRoomType) {
      this.showInfoText("Select a room type from the palette first.");
      return;
    }

    const state = gameStore.getState();
    const hub = state.stationHub;
    if (!hub) return;

    const result = buildRoom(
      hub,
      this.selectedRoomType,
      gx,
      gy,
      state.cash,
      state.tech,
    );
    if (result) {
      gameStore.update({
        stationHub: result.hub,
        cash: state.cash - result.cost,
      });
      this.selectedRoomType = null;
      this.scene.restart();
    }
  }

  // ── Drag-and-drop ──

  private startDrag(rt: HubRoomType, pointer: Phaser.Input.Pointer): void {
    if (this.dragGhost) {
      this.dragGhost.destroy();
    }
    const width = this.roomCardWidth;
    const height = this.roomCardHeight;

    const ghost = this.add.container(pointer.worldX, pointer.worldY);
    const card = this.createRoomCardVisual({
      x: 0,
      y: 0,
      width,
      height,
      roomType: rt,
      enabled: true,
      showCost: false,
      selected: true,
    });
    ghost.add(card.bg);
    ghost.add(card.iconText);
    ghost.add(card.nameText);

    ghost.setAlpha(0.85);
    ghost.setDepth(1000);
    this.dragGhost = ghost;
    this.dragRoomType = rt;
  }

  private onDragMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragGhost) return;
    this.dragGhost.setPosition(pointer.worldX, pointer.worldY);

    // Highlight valid drop target
    const target = this.getDropCell(pointer.worldX, pointer.worldY);
    const theme = getTheme();
    for (const slot of this.gridSlotBounds) {
      if (!slot.valid) continue;
      const cell = this.gridCells[slot.gy]?.[slot.gx];
      if (!cell) continue;
      if (target && target.gx === slot.gx && target.gy === slot.gy) {
        cell.setStrokeStyle(2, theme.colors.accent);
      } else {
        cell.setStrokeStyle(1, theme.colors.panelBorder);
      }
    }
  }

  private onDragEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.dragGhost || !this.dragRoomType) return;

    const target = this.getDropCell(pointer.worldX, pointer.worldY);

    if (target) {
      const state = gameStore.getState();
      const hub = state.stationHub;
      if (hub) {
        const result = buildRoom(
          hub,
          this.dragRoomType,
          target.gx,
          target.gy,
          state.cash,
          state.tech,
        );
        if (result) {
          gameStore.update({
            stationHub: result.hub,
            cash: state.cash - result.cost,
          });
          this.dragGhost.destroy();
          this.dragGhost = null;
          this.dragRoomType = null;
          this.scene.restart();
          return;
        }
      }
    }

    // Clean up ghost and reset highlights
    this.dragGhost.destroy();
    this.dragGhost = null;
    this.dragRoomType = null;
    const theme = getTheme();
    for (const slot of this.gridSlotBounds) {
      if (!slot.valid) continue;
      const cell = this.gridCells[slot.gy]?.[slot.gx];
      if (cell) {
        cell.setStrokeStyle(1, theme.colors.panelBorder);
      }
    }
  }

  private getDropCell(
    worldX: number,
    worldY: number,
  ): { gx: number; gy: number } | null {
    for (const slot of this.gridSlotBounds) {
      if (!slot.valid) continue;
      if (slot.bounds.contains(worldX, worldY)) {
        return { gx: slot.gx, gy: slot.gy };
      }
    }
    return null;
  }

  private getGridMetrics(): {
    content: { x: number; y: number; width: number; height: number };
    cellW: number;
    cellH: number;
  } {
    const content = this.gridPanel.getContentArea();
    const cellW =
      (content.width - (HUB_GRID_SLOTS_PER_DECK - 1) * 4) /
      HUB_GRID_SLOTS_PER_DECK;
    const cellH = (content.height - (HUB_GRID_DECKS - 1) * 4) / HUB_GRID_DECKS;
    return { content, cellW, cellH };
  }

  private createRoomCardVisual(params: {
    x: number;
    y: number;
    width: number;
    height: number;
    roomType: HubRoomType;
    enabled: boolean;
    showCost: boolean;
    selected: boolean;
    interactive?: boolean;
  }): {
    bg: Phaser.GameObjects.Rectangle;
    iconText: Phaser.GameObjects.Text;
    nameText: Phaser.GameObjects.Text;
    costText?: Phaser.GameObjects.Text;
    roomColor: number;
  } {
    const theme = getTheme();
    const {
      x,
      y,
      width,
      height,
      roomType,
      enabled,
      showCost,
      selected,
      interactive = false,
    } = params;
    const def = HUB_ROOM_DEFINITIONS[roomType];
    const roomColor = ROOM_COLORS[roomType] ?? 0x555555;

    const bg = this.add
      .rectangle(x, y, width, height, roomColor, selected ? 0.5 : 0.22)
      .setStrokeStyle(selected ? 2 : 1, roomColor);

    if (interactive) {
      bg.setInteractive({ useHandCursor: enabled });
    }

    const iconText = this.add
      .text(x - width / 2 + 10, y - height / 2 + 8, def.icon, {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
        color: enabled ? colorToString(theme.colors.text) : "#a0a0a0",
      })
      .setOrigin(0, 0);

    const nameText = this.add
      .text(x - width / 2 + 24, y - height / 2 + 8, def.name, {
        fontSize: "9px",
        fontFamily: theme.fonts.caption.family,
        color: enabled ? "#ffffff" : "#a0a0a0",
        align: "left",
        wordWrap: { width: width - 30 },
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: "#000000",
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0, 0);

    let costText: Phaser.GameObjects.Text | undefined;
    if (showCost) {
      costText = this.add
        .text(
          x - width / 2 + 8,
          y + height / 2 - 12,
          formatCash(def.buildCost),
          {
            fontSize: "9px",
            fontFamily: theme.fonts.caption.family,
            color: enabled
              ? colorToString(theme.colors.profit)
              : colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(0, 0);
    }

    return {
      bg,
      iconText,
      nameText,
      costText,
      roomColor,
    };
  }

  private confirmDemolish(): void {
    if (!this.selectedRoomId) return;
    const state = gameStore.getState();
    const hub = state.stationHub;
    if (!hub) return;

    const room = hub.rooms.find((r) => r.id === this.selectedRoomId);
    if (!room) return;

    // Terminal rooms cannot be demolished
    if (isTerminalRoom(room.type)) {
      this.showInfoText("Terminal modules cannot be demolished.");
      return;
    }

    const def = HUB_ROOM_DEFINITIONS[room.type];
    const refund = Math.floor(def.buildCost * HUB_DEMOLISH_REFUND_RATIO);

    new Modal(this, {
      title: `Demolish ${def.name}?`,
      body: `Refund: ${formatCash(refund)}. This cannot be undone.`,
      okText: "Demolish",
      cancelText: "Cancel",
      onOk: () => {
        const result = demolishRoom(hub, this.selectedRoomId!);
        if (result) {
          gameStore.update({
            stationHub: result.hub,
            cash: state.cash + result.refund,
          });
        }
        this.scene.restart();
      },
      onCancel: () => {},
    });
  }

  private confirmUpgrade(hub: StationHub): void {
    const state = gameStore.getState();
    const nextLevel = hub.level + 1;
    const cost = HUB_UPGRADE_COSTS[nextLevel];

    new Modal(this, {
      title: `Upgrade to Level ${nextLevel}?`,
      body: `Cost: ${formatCash(cost)}. Unlocks ${HUB_LEVEL_SLOTS[nextLevel]} room slots.`,
      okText: "Upgrade",
      cancelText: "Cancel",
      onOk: () => {
        const result = upgradeHub(hub, state.cash);
        if (result) {
          gameStore.update({
            stationHub: result.hub,
            cash: state.cash - result.cost,
          });
        }
        this.scene.restart();
      },
      onCancel: () => {},
    });
  }

  // ── Info panel display helpers ──

  private clearInfoElements(): void {
    for (const el of this.infoElements) {
      el.destroy();
    }
    this.infoElements = [];
  }

  private showInfoText(text: string): void {
    this.clearInfoElements();
    const label = new Label(this, {
      x: this.infoContent.x + 8,
      y: this.infoContent.y + 4,
      text,
      style: "caption",
      maxWidth: this.infoContent.width - 16,
    });
    label.setOrigin(0, 0);
    this.infoPanel.add(label);
    this.infoElements.push(label);
  }

  private showDefaultInfo(hub: StationHub | null, cash: number): void {
    this.clearInfoElements();

    const label = new Label(this, {
      x: this.infoContent.x + 8,
      y: this.infoContent.y + 4,
      text: hub
        ? "Select a room to build, or click a placed room to inspect."
        : "Hub station not yet established.",
      style: "caption",
      maxWidth: this.infoContent.width - 200,
    });
    label.setOrigin(0, 0);
    this.infoPanel.add(label);
    this.infoElements.push(label);

    // Hub upgrade button
    if (hub && hub.level < HUB_MAX_LEVEL) {
      const nextCost = HUB_UPGRADE_COSTS[hub.level + 1];
      const canAfford = cash >= nextCost;
      const upgradeBtn = new Button(this, {
        x: this.infoContent.x + this.infoContent.width - 140,
        y: this.infoContent.y + 4,
        label: `Upgrade Lv${hub.level + 1} (${formatCash(nextCost)})`,
        onClick: () => {
          this.confirmUpgrade(hub);
        },
        disabled: !canAfford,
        autoWidth: true,
      });
      this.infoPanel.add(upgradeBtn);
      this.infoElements.push(upgradeBtn);
    }
  }

  private showRoomInfo(roomType: HubRoomType): void {
    this.clearInfoElements();
    const theme = getTheme();
    const def = HUB_ROOM_DEFINITIONS[roomType];

    // Update sidebar portrait for this room
    this.portrait.updatePortrait(
      "planet",
      roomPortraitSeed(roomType),
      def.name,
      [
        { label: "Cost", value: formatCash(def.buildCost) },
        { label: "Upkeep", value: formatCash(def.upkeepCost) + "/turn" },
        { label: "Limit", value: String(def.limit) },
      ],
      { textureKey: getRoomPortraitTextureKey(roomType) },
    );

    // Description line
    const descLabel = new Label(this, {
      x: this.infoContent.x + 8,
      y: this.infoContent.y + 4,
      text: `${def.icon} ${def.name}: ${def.description}`,
      style: "caption",
      maxWidth: this.infoContent.width - 16,
    });
    descLabel.setOrigin(0, 0);
    this.infoPanel.add(descLabel);
    this.infoElements.push(descLabel);

    // Effects list
    const effectLines = def.bonusEffects
      .map((e) => `• ${formatEffect(e.type, e.value)}`)
      .join("\n");
    if (effectLines) {
      const effectLabel = new Label(this, {
        x: this.infoContent.x + 8,
        y: this.infoContent.y + 24,
        text: `Scope: ${def.bonusScope}\n${effectLines}`,
        style: "caption",
        color: theme.colors.accent,
        maxWidth: this.infoContent.width - 16,
      });
      effectLabel.setOrigin(0, 0);
      this.infoPanel.add(effectLabel);
      this.infoElements.push(effectLabel);
    }

    // Build hint
    const state = gameStore.getState();
    const hub = state.stationHub;
    const check = hub
      ? canBuildRoom(hub, roomType, state.tech.completedTechIds, state.cash)
      : { canBuild: false, reason: "No hub" };
    if (check.canBuild) {
      const hint = new Label(this, {
        x: this.infoContent.x + 8,
        y: this.infoContent.y + this.infoContent.height - 20,
        text: "Click an empty grid cell to build.",
        style: "caption",
        color: theme.colors.profit,
      });
      hint.setOrigin(0, 0);
      this.infoPanel.add(hint);
      this.infoElements.push(hint);
    }
  }

  private showBuiltRoomInfo(hub: StationHub, room: HubRoom): void {
    this.clearInfoElements();
    const theme = getTheme();
    const def = HUB_ROOM_DEFINITIONS[room.type];
    const terminal = isTerminalRoom(room.type);

    // Update sidebar portrait for this room
    this.portrait.updatePortrait(
      "planet",
      roomPortraitSeed(room.type),
      def.name,
      [
        { label: "Upkeep", value: formatCash(def.upkeepCost) + "/turn" },
        { label: "Scope", value: def.bonusScope },
      ],
      { textureKey: getRoomPortraitTextureKey(room.type) },
    );

    const descLabel = new Label(this, {
      x: this.infoContent.x + 8,
      y: this.infoContent.y + 4,
      text: `${def.icon} ${def.name}: ${def.description}`,
      style: "caption",
      maxWidth: this.infoContent.width - 200,
    });
    descLabel.setOrigin(0, 0);
    this.infoPanel.add(descLabel);
    this.infoElements.push(descLabel);

    const state = gameStore.getState();

    if (terminal) {
      // Terminal rooms: show upgrade button or max level indicator
      const upgrade = getTerminalUpgrade(room.type);
      if (upgrade) {
        const canAfford = state.cash >= upgrade.cost;
        const upgDef = HUB_ROOM_DEFINITIONS[upgrade.to];
        const upgradeBtn = new Button(this, {
          x: this.infoContent.x + this.infoContent.width - 140,
          y: this.infoContent.y + 4,
          label: `Upgrade → ${upgDef.name} (${formatCash(upgrade.cost)})`,
          onClick: () => {
            this.confirmTerminalUpgrade(hub, room.id);
          },
          disabled: !canAfford,
          autoWidth: true,
        });
        this.infoPanel.add(upgradeBtn);
        this.infoElements.push(upgradeBtn);
      } else {
        const maxLabel = new Label(this, {
          x: this.infoContent.x + this.infoContent.width - 100,
          y: this.infoContent.y + 8,
          text: "✦ Max Level",
          style: "caption",
          color: theme.colors.accent,
        });
        maxLabel.setOrigin(0, 0);
        this.infoPanel.add(maxLabel);
        this.infoElements.push(maxLabel);
      }
    } else {
      // Non-terminal rooms: show demolish button
      const refund = Math.floor(def.buildCost * HUB_DEMOLISH_REFUND_RATIO);
      const demolishBtn = new Button(this, {
        x: this.infoContent.x + this.infoContent.width - 140,
        y: this.infoContent.y + 4,
        label: `Demolish (+${formatCash(refund)})`,
        onClick: () => {
          this.confirmDemolish();
        },
        autoWidth: true,
      });
      this.infoPanel.add(demolishBtn);
      this.infoElements.push(demolishBtn);
    }
  }

  // ── Portrait helpers ──

  private showHubPortrait(hub: StationHub | null): void {
    const stats: Array<{ label: string; value: string }> = [];
    if (hub) {
      stats.push({ label: "Level", value: String(hub.level) });
      stats.push({
        label: "Rooms",
        value: `${hub.rooms.length}/${HUB_LEVEL_SLOTS[hub.level]}`,
      });
      stats.push({
        label: "Upkeep",
        value: formatCash(getHubUpkeep(hub)) + "/turn",
      });
      stats.push({
        label: "Slots Free",
        value: String(getAvailableSlots(hub)),
      });
    } else {
      stats.push({ label: "Status", value: "Not established" });
    }
    this.portrait.updatePortrait("planet", 0, "Hub Station", stats, {
      textureKey: "planet-portrait-hubStation",
    });
  }

  // ── Modals ──

  private confirmTerminalUpgrade(hub: StationHub, roomId: string): void {
    const state = gameStore.getState();
    const room = hub.rooms.find((r) => r.id === roomId);
    if (!room) return;

    const upgrade = getTerminalUpgrade(room.type);
    if (!upgrade) return;

    const toDef = HUB_ROOM_DEFINITIONS[upgrade.to];

    new Modal(this, {
      title: `Upgrade to ${toDef.name}?`,
      body: `Cost: ${formatCash(upgrade.cost)}. ${toDef.description}`,
      okText: "Upgrade",
      cancelText: "Cancel",
      onOk: () => {
        const result = upgradeTerminal(hub, roomId, state.cash);
        if (result) {
          gameStore.update({
            stationHub: result.hub,
            cash: state.cash - result.cost,
          });
        }
        this.scene.restart();
      },
      onCancel: () => {},
    });
  }
}
