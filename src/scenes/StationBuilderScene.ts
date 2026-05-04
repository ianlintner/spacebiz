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
  StationBuilderGrid,
  ROOM_COLORS,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
import type { CellEventPayload } from "../ui/StationBuilderGrid.ts";
import {
  HUB_ROOM_DEFINITIONS,
  HUB_UPGRADE_COSTS,
  HUB_LEVEL_SLOTS,
  HUB_MAX_LEVEL,
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
  private roomCardWidth = 110;
  private roomCardHeight = 50;
  private gridPanel!: Panel;
  private palettePanel!: Panel;
  private infoPanel!: Panel;
  private infoContent!: { x: number; y: number; width: number; height: number };
  private infoElements: Phaser.GameObjects.GameObject[] = [];
  private dragGhost: Phaser.GameObjects.Container | null = null;
  private dragRoomType: HubRoomType | null = null;
  private grid!: StationBuilderGrid;
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
      title: this.gridTitle(hub),
    });

    // ── Placement grid widget (overlays the panel content area) ──
    const gridArea = this.getGridArea();
    this.grid = new StationBuilderGrid(this, {
      x: gridArea.x,
      y: gridArea.y,
      width: gridArea.width,
      height: gridArea.height,
    });
    this.grid.setRooms({
      rooms: hub ? hub.rooms : [],
      maxSlots: hub ? HUB_LEVEL_SLOTS[hub.level] : 0,
    });
    this.grid.on("cell:click", (e: CellEventPayload) => this.onCellClick(e));

    const cellSize = this.grid.getCellSize();
    this.roomCardWidth = Math.floor(cellSize.cellW);
    this.roomCardHeight = Math.floor(cellSize.cellH);

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
   * The placement grid is now driven by `StationBuilderGrid.setSize` so it
   * reflows in place — no scene restart needed. Palette cards and info-panel
   * children are still rebuilt only on user action (build/demolish/upgrade);
   * the outer panels are sized here so the inner content keeps its initial
   * layout until the next action. That's a known limitation tracked
   * separately from the grid lift.
   */
  private relayout(): void {
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;

    // PortraitPanel: setPosition before setSize.
    this.portrait.setPosition(L.sidebarLeft, contentTop);
    this.portrait.setSize(L.sidebarWidth, contentHeight);

    // Grid panel + grid widget.
    this.gridPanel.setPosition(L.mainContentLeft, contentTop);
    this.gridPanel.setSize(L.mainContentWidth, GRID_PANEL_HEIGHT);
    const gridArea = this.getGridArea();
    this.grid.setPosition(gridArea.x, gridArea.y);
    this.grid.setSize(gridArea.width, gridArea.height);

    // Palette panel.
    const paletteY = contentTop + GRID_PANEL_HEIGHT + PANEL_GAP;
    this.palettePanel.setPosition(L.mainContentLeft, paletteY);
    this.palettePanel.setSize(L.mainContentWidth, PALETTE_PANEL_HEIGHT);

    // Info panel.
    const infoY = paletteY + PALETTE_PANEL_HEIGHT + PANEL_GAP;
    const infoH =
      contentHeight - GRID_PANEL_HEIGHT - PALETTE_PANEL_HEIGHT - PANEL_GAP * 2;
    this.infoPanel.setPosition(L.mainContentLeft, infoY);
    this.infoPanel.setSize(L.mainContentWidth, Math.max(infoH, 120));

    // Re-read content area after panel resize.
    this.infoContent = this.infoPanel.getContentArea();
  }

  /**
   * Title text for the grid panel. Reflects current hub level + slot usage,
   * or a "no hub" placeholder when the player hasn't established a station.
   */
  private gridTitle(hub: StationHub | null): string {
    return hub
      ? `Station Grid — Level ${hub.level} (${hub.rooms.length}/${HUB_LEVEL_SLOTS[hub.level]} slots)`
      : "No Hub Station";
  }

  /**
   * World-space rectangle the placement grid widget should occupy. Derived
   * from the grid panel's content area so the widget stays inside the panel
   * border at every viewport size.
   */
  private getGridArea(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const c = this.gridPanel.getContentArea();
    return {
      x: this.gridPanel.x + c.x,
      y: this.gridPanel.y + c.y,
      width: c.width,
      height: c.height,
    };
  }

  /**
   * Refresh the grid widget + panel title after a state change (build /
   * demolish / upgrade) — replaces the previous `scene.restart()` path for
   * the grid view. The palette + info panels are still updated by their own
   * code paths.
   */
  private refreshGrid(): void {
    const hub = gameStore.getState().stationHub;
    this.gridPanel.setTitle(this.gridTitle(hub));
    this.grid.setRooms({
      rooms: hub ? hub.rooms : [],
      maxSlots: hub ? HUB_LEVEL_SLOTS[hub.level] : 0,
    });
  }

  /**
   * Common post-action refresh: grid + sidebar portrait + default info panel.
   * Read state once so all three observers see the same snapshot.
   */
  private refreshAfterAction(): void {
    this.refreshGrid();
    const next = gameStore.getState();
    this.showHubPortrait(next.stationHub);
    this.showDefaultInfo(next.stationHub, next.cash);
  }

  /**
   * Translate a `cell:click` event from the grid widget into the scene's
   * existing select / build / demolish flows.
   */
  private onCellClick(e: CellEventPayload): void {
    if (this.dragGhost) return;
    const hub = gameStore.getState().stationHub;
    if (!hub) return;
    if (e.room) {
      this.selectedRoomType = null;
      this.selectedRoomId = e.room.id;
      this.showBuiltRoomInfo(hub, e.room);
    } else {
      this.handleGridClick(e.gx, e.gy);
    }
  }

  // ── Grid interaction (widget owns rendering / hit testing) ──

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
      this.refreshAfterAction();
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
    this.grid.setSelectedTool(rt);
  }

  private onDragMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragGhost) return;
    this.dragGhost.setPosition(pointer.worldX, pointer.worldY);
    this.grid.updateDragHighlight(pointer.worldX, pointer.worldY);
  }

  private onDragEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.dragGhost || !this.dragRoomType) return;

    const target = this.grid.getDropCell(pointer.worldX, pointer.worldY);

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
          this.grid.setSelectedTool(null);
          this.refreshAfterAction();
          return;
        }
      }
    }

    // Clean up ghost and reset highlights
    this.dragGhost.destroy();
    this.dragGhost = null;
    this.dragRoomType = null;
    this.grid.setSelectedTool(null);
    this.grid.clearDragHighlight();
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
        this.selectedRoomId = null;
        this.refreshAfterAction();
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
        this.refreshAfterAction();
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
        this.selectedRoomId = null;
        this.refreshAfterAction();
      },
      onCancel: () => {},
    });
  }
}
