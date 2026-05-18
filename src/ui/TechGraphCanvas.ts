import * as Phaser from "phaser";
import type { Technology } from "../data/types.ts";
import { TECH_GRAPH } from "../data/constants.ts";
import { applyClippingMask, getTheme, getBranchColor } from "@spacebiz/ui";

export const BRANCH_LABELS: Record<string, string> = {
  Logistics: "Logistics",
  Engineering: "Engineering",
  Intelligence: "Intelligence",
  Crisis: "Crisis Management",
  Diplomacy: "Diplomacy",
};

export interface TechGraphState {
  completedTechIds: string[];
  purchaseCount: Record<string, number>;
  queue: string[];
  researchPoints: number;
  isAvailable: (techId: string) => boolean;
}

export interface TechGraphCanvasConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect: (techId: string) => void;
}

const RING_SPACING = 130;
const NODE_SIZE = 60;
const HALF = NODE_SIZE / 2;

type NodeState =
  | "completed"
  | "researching"
  | "queued"
  | "available"
  | "locked";

interface NodeView {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics; // NEW: outer halo behind bg
  iconText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  tech: Technology;
}

export class TechGraphCanvas extends Phaser.GameObjects.Container {
  private config: TechGraphCanvasConfig;
  private graphGroup: Phaser.GameObjects.Container;
  private edgeGfx: Phaser.GameObjects.Graphics;
  private nodeViews = new Map<string, NodeView>();
  private panX = 0;
  private panY = 0;
  private zoom = 0.7;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;
  private currentState: TechGraphState | null = null;
  private bgHit: Phaser.GameObjects.Rectangle;
  private clipMask!: Phaser.GameObjects.Graphics;
  private maskSyncBound!: () => void;
  private _onMove: ((ptr: Phaser.Input.Pointer) => void) | null = null;
  private _onUp: (() => void) | null = null;
  private _onWheel: (
    _ptr: Phaser.Input.Pointer,
    _gos: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number,
  ) => void = () => undefined;

  constructor(scene: Phaser.Scene, config: TechGraphCanvasConfig) {
    super(scene, config.x, config.y);
    this.config = config;
    scene.add.existing(this);

    // Background hit area for pan
    this.bgHit = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();
    this.add(this.bgHit);

    // Graph group (pan/zoom target)
    this.graphGroup = new Phaser.GameObjects.Container(
      scene,
      config.width / 2,
      config.height / 2,
    );
    scene.add.existing(this.graphGroup);
    this.add(this.graphGroup);

    // Edge layer (drawn first, below nodes)
    this.edgeGfx = scene.add.graphics();
    this.graphGroup.add(this.edgeGfx);

    // Build nodes
    this.buildNodes();

    // Apply initial zoom
    this.graphGroup.setScale(this.zoom);

    // Clip mask — keeps graph content within the canvas bounds when panning
    // or zooming. Applied to the graphGroup Container (the filter mask
    // propagates to all children when set up correctly via applyClippingMask:
    // it calls enableFilters() to allocate the filter camera, then
    // filters.internal.addMask(maskShape, false, undefined, "world") so the
    // mask Graphics is interpreted in world coordinates). The mask shape is
    // repositioned each preupdate to track this canvas's world transform —
    // same pattern as ScrollFrame in @spacebiz/ui.
    this.clipMask = scene.make.graphics({});
    this.redrawClipMask();
    applyClippingMask(this.graphGroup, this.clipMask);
    this.syncMaskPosition();
    this.maskSyncBound = () => this.syncMaskPosition();
    scene.events.on("preupdate", this.maskSyncBound, this);

    // Setup pan/zoom input
    this.setupPanZoom();
  }

  private redrawClipMask(): void {
    this.clipMask.clear();
    this.clipMask.fillStyle(0xffffff);
    this.clipMask.fillRect(0, 0, this.config.width, this.config.height);
  }

  private syncMaskPosition(): void {
    const matrix = this.getWorldTransformMatrix();
    this.clipMask.setPosition(matrix.tx, matrix.ty);
  }

  private polarToXY(angle: number, radius: number): { x: number; y: number } {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius * RING_SPACING,
      y: Math.sin(rad) * radius * RING_SPACING,
    };
  }

  private buildNodes(): void {
    const theme = getTheme();

    for (const tech of TECH_GRAPH) {
      const { x, y } = this.polarToXY(
        tech.position.angle,
        tech.position.radius,
      );

      // Glow layer (drawn first, behind everything; additive blend).
      const glow = this.scene.add.graphics();
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setAlpha(0);

      const bg = this.scene.add.graphics();

      const iconText = this.scene.add
        .text(0, -8, tech.icon, {
          fontSize: "20px",
          fontFamily: theme.fonts.body.family,
        })
        .setOrigin(0.5, 0.5);

      const nameText = this.scene.add
        .text(0, 14, tech.name, {
          fontSize: "8px",
          fontFamily: theme.fonts.body.family,
          color: "#ccccdd",
          wordWrap: { width: NODE_SIZE - 4 },
          align: "center",
        })
        .setOrigin(0.5, 0);

      const nodeContainer = new Phaser.GameObjects.Container(this.scene, x, y, [
        glow,
        bg,
        iconText,
        nameText,
      ]);
      this.scene.add.existing(nodeContainer);
      nodeContainer.setSize(NODE_SIZE, NODE_SIZE);
      nodeContainer.setInteractive();
      nodeContainer.on("pointerup", () => this.config.onSelect(tech.id));
      nodeContainer.on("pointerover", () => this.applyHoverStyle(tech.id));
      nodeContainer.on("pointerout", () => this.refreshNodeView(tech.id));

      this.graphGroup.add(nodeContainer);
      this.nodeViews.set(tech.id, {
        container: nodeContainer,
        bg,
        glow,
        iconText,
        nameText,
        tech,
      });
    }
  }

  private drawEdges(state: TechGraphState): void {
    this.edgeGfx.clear();
    const drawn = new Set<string>();
    for (const tech of TECH_GRAPH) {
      const { x: x1, y: y1 } = this.polarToXY(
        tech.position.angle,
        tech.position.radius,
      );
      for (const neighborId of tech.edges) {
        const edgeKey = [tech.id, neighborId].sort().join("|");
        if (drawn.has(edgeKey)) continue;
        drawn.add(edgeKey);
        const neighbor = TECH_GRAPH.find((n) => n.id === neighborId);
        if (!neighbor) continue;
        const { x: x2, y: y2 } = this.polarToXY(
          neighbor.position.angle,
          neighbor.position.radius,
        );
        const aDone = state.completedTechIds.includes(tech.id);
        const bDone = state.completedTechIds.includes(neighborId);
        const bothDone = aDone && bDone;
        const eitherDone = aDone || bDone;

        // Branch color = higher-tier endpoint's branch (fallback to tech's branch)
        const branchTech = neighbor.tier > tech.tier ? neighbor : tech;
        const branchColor = getBranchColor(branchTech.branch);

        if (bothDone) {
          // Glow pass first (wide, dim, additive)
          this.edgeGfx.lineStyle(6, branchColor, 0.25);
          this.edgeGfx.beginPath();
          this.edgeGfx.moveTo(x1, y1);
          this.edgeGfx.lineTo(x2, y2);
          this.edgeGfx.strokePath();
          // Core line
          this.edgeGfx.lineStyle(3, branchColor, 1);
          this.edgeGfx.beginPath();
          this.edgeGfx.moveTo(x1, y1);
          this.edgeGfx.lineTo(x2, y2);
          this.edgeGfx.strokePath();
        } else if (eitherDone) {
          this.edgeGfx.lineStyle(1.5, branchColor, 0.35);
          this.edgeGfx.beginPath();
          this.edgeGfx.moveTo(x1, y1);
          this.edgeGfx.lineTo(x2, y2);
          this.edgeGfx.strokePath();
        } else {
          this.edgeGfx.lineStyle(1, 0x243049, 1);
          this.edgeGfx.beginPath();
          this.edgeGfx.moveTo(x1, y1);
          this.edgeGfx.lineTo(x2, y2);
          this.edgeGfx.strokePath();
        }
      }
    }
  }

  private getNodeState(techId: string, state: TechGraphState): NodeState {
    if (state.completedTechIds.includes(techId)) return "completed";
    if (state.queue[0] === techId) return "researching";
    if (state.queue.includes(techId)) return "queued";
    if (state.isAvailable(techId)) return "available";
    return "locked";
  }

  private refreshNodeView(techId: string): void {
    if (!this.currentState) return;
    const view = this.nodeViews.get(techId);
    if (!view) return;
    const nodeState = this.getNodeState(techId, this.currentState);
    const branchColor = getBranchColor(view.tech.branch);
    const RESEARCHING_COLOR = 0xfcd96f; // gold

    view.bg.clear();
    view.glow.clear();
    view.glow.setAlpha(0);

    switch (nodeState) {
      case "locked": {
        view.container.setAlpha(0.35);
        view.bg.fillStyle(0x1a2235, 1);
        view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        view.bg.lineStyle(1, 0x2c3a55, 1);
        view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        break;
      }
      case "available": {
        view.container.setAlpha(0.92);
        view.bg.fillStyle(0x141c2e, 0.95);
        view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        view.bg.lineStyle(2, branchColor, 1);
        view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        break;
      }
      case "queued": {
        view.container.setAlpha(1);
        view.bg.fillStyle(0x141c2e, 0.95);
        view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        view.bg.lineStyle(2, branchColor, 1);
        view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        this.drawHalo(view.glow, branchColor, 0.35);
        view.glow.setAlpha(1);
        break;
      }
      case "researching": {
        view.container.setAlpha(1);
        view.bg.fillStyle(0x2a1a08, 1);
        view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        view.bg.lineStyle(2, RESEARCHING_COLOR, 1);
        view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        this.drawHalo(view.glow, RESEARCHING_COLOR, 0.6);
        view.glow.setAlpha(0.55);
        // Breathing animation is started by ensureBreathingTween (Task 4).
        break;
      }
      case "completed": {
        view.container.setAlpha(1);
        view.bg.fillStyle(0x0d1a30, 1);
        view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        view.bg.lineStyle(2, branchColor, 1);
        view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
        this.drawHalo(view.glow, branchColor, 0.45);
        view.glow.setAlpha(1);
        break;
      }
    }
  }

  private drawHalo(
    g: Phaser.GameObjects.Graphics,
    color: number,
    intensity: number,
  ): void {
    // Three concentric stroked rects with falling alpha — cheap, no shader.
    for (let i = 0; i < 3; i++) {
      const pad = 4 + i * 4;
      const alpha = intensity * (1 - i * 0.3);
      g.lineStyle(2, color, alpha);
      g.strokeRoundedRect(
        -HALF - pad,
        -HALF - pad,
        NODE_SIZE + pad * 2,
        NODE_SIZE + pad * 2,
        10 + i * 2,
      );
    }
  }

  private applyHoverStyle(techId: string): void {
    const view = this.nodeViews.get(techId);
    if (!view) return;
    // Brighten the existing bg by drawing a white overlay.
    view.bg.lineStyle(2, 0xffffff, 0.9);
    view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
  }

  setGraphState(state: TechGraphState): this {
    this.currentState = state;
    this.drawEdges(state);
    for (const tech of TECH_GRAPH) {
      this.refreshNodeView(tech.id);
    }
    return this;
  }

  override setPosition(x?: number, y?: number): this {
    super.setPosition(x, y);
    if (this.clipMask) this.syncMaskPosition();
    return this;
  }

  override setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.config.width = width;
    this.config.height = height;
    this.bgHit.setSize(width, height);
    this.graphGroup.setPosition(width / 2 + this.panX, height / 2 + this.panY);
    if (this.clipMask) {
      this.redrawClipMask();
      this.syncMaskPosition();
    }
    return this;
  }

  private setupPanZoom(): void {
    this.bgHit.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = ptr.x;
      this.dragStartY = ptr.y;
      this.dragStartPanX = this.panX;
      this.dragStartPanY = this.panY;
    });

    this._onMove = (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.panX = this.dragStartPanX + (ptr.x - this.dragStartX);
      this.panY = this.dragStartPanY + (ptr.y - this.dragStartY);
      this.graphGroup.setPosition(
        this.config.width / 2 + this.panX,
        this.config.height / 2 + this.panY,
      );
    };

    this._onUp = () => {
      this.isDragging = false;
    };

    this._onWheel = (
      _ptr: Phaser.Input.Pointer,
      _gos: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number,
    ) => {
      const delta = dy > 0 ? -0.05 : 0.05;
      this.zoom = Phaser.Math.Clamp(this.zoom + delta, 0.4, 1.4);
      this.graphGroup.setScale(this.zoom);
    };

    this.scene.input.on("pointermove", this._onMove);
    this.scene.input.on("pointerup", this._onUp);
    this.scene.input.on("wheel", this._onWheel);
  }

  override destroy(fromScene?: boolean): void {
    if (this._onMove) this.scene.input.off("pointermove", this._onMove);
    if (this._onUp) this.scene.input.off("pointerup", this._onUp);
    if (this._onWheel) this.scene.input.off("wheel", this._onWheel);
    if (this.maskSyncBound) {
      this.scene.events.off("preupdate", this.maskSyncBound, this);
    }
    this.clipMask?.destroy();
    super.destroy(fromScene);
  }
}
