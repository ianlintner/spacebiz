import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";
import { computeNextExpanded } from "./accordionLogic.ts";

export { computeNextExpanded } from "./accordionLogic.ts";

export interface AccordionSection {
  title: string;
  /** Either an existing GameObject or a lazy factory invoked on first expand. */
  content:
    | Phaser.GameObjects.GameObject
    | (() => Phaser.GameObjects.GameObject);
  /** Override the auto-measured content height (px). */
  contentHeight?: number;
}

export interface AccordionConfig {
  x: number;
  y: number;
  width: number;
  sections: AccordionSection[];
  /** Allow more than one section open at a time. Default false. */
  allowMultiple?: boolean;
  /** Indices of sections expanded on mount. Default []. */
  defaultExpanded?: number[];
  /** Header height in pixels. Default 32. */
  headerHeight?: number;
  /** Tween duration in ms. Default 220. */
  durationMs?: number;
}

interface SectionRuntime {
  index: number;
  title: string;
  header: Phaser.GameObjects.Container;
  contentContainer: Phaser.GameObjects.Container;
  contentObject: Phaser.GameObjects.GameObject | null;
  factory: (() => Phaser.GameObjects.GameObject) | null;
  contentHeight: number;
  expanded: boolean;
  chevron: Phaser.GameObjects.Text;
}

export class Accordion extends Phaser.GameObjects.Container {
  private readonly widthPx: number;
  private readonly headerHeight: number;
  private readonly durationMs: number;
  private readonly allowMultiple: boolean;
  private sections: SectionRuntime[] = [];
  private expandedIndices: Set<number> = new Set();

  constructor(scene: Phaser.Scene, config: AccordionConfig) {
    super(scene, config.x, config.y);
    this.widthPx = config.width;
    this.headerHeight = config.headerHeight ?? 32;
    this.durationMs = config.durationMs ?? 220;
    this.allowMultiple = config.allowMultiple ?? false;

    config.sections.forEach((section, idx) => this.buildSection(section, idx));

    const initial = config.defaultExpanded ?? [];
    if (!this.allowMultiple && initial.length > 1) {
      this.expandedIndices = new Set(initial.slice(0, 1));
    } else {
      this.expandedIndices = new Set(initial);
    }

    for (const idx of this.expandedIndices) {
      this.materializeContent(idx);
      this.sections[idx].expanded = true;
    }
    this.relayout(false);

    scene.add.existing(this);
  }

  private buildSection(section: AccordionSection, index: number): void {
    const theme = getTheme();
    const header = this.scene.add.container(0, 0);

    const headerBg = this.scene.add
      .rectangle(
        0,
        0,
        this.widthPx,
        this.headerHeight,
        theme.colors.headerBg,
        1,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
    header.add(headerBg);

    const chevron = this.scene.add
      .text(theme.spacing.sm, this.headerHeight / 2, "▶", {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(0, 0.5);
    header.add(chevron);

    const titleText = this.scene.add
      .text(theme.spacing.sm + 16, this.headerHeight / 2, section.title, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0, 0.5);
    header.add(titleText);

    headerBg.setInteractive({ useHandCursor: true });
    headerBg.on("pointerover", () => {
      headerBg.setFillStyle(theme.colors.rowHover, 1);
      playUiSfx("ui_hover");
    });
    headerBg.on("pointerout", () => {
      headerBg.setFillStyle(theme.colors.headerBg, 1);
    });
    headerBg.on("pointerup", () => {
      playUiSfx("ui_click_primary");
      this.toggle(index);
    });

    const contentContainer = this.scene.add.container(0, 0);
    contentContainer.setSize(this.widthPx, 0);

    let factory: (() => Phaser.GameObjects.GameObject) | null = null;
    let contentObject: Phaser.GameObjects.GameObject | null = null;
    if (typeof section.content === "function") {
      factory = section.content;
    } else {
      contentObject = section.content;
    }

    this.add([header, contentContainer]);

    this.sections.push({
      index,
      title: section.title,
      header,
      contentContainer,
      contentObject,
      factory,
      contentHeight: section.contentHeight ?? 0,
      expanded: false,
      chevron,
    });
  }

  private materializeContent(index: number): void {
    const s = this.sections[index];
    if (!s.contentObject && s.factory) {
      s.contentObject = s.factory();
      s.factory = null;
    }
    if (
      s.contentObject &&
      s.contentObject.parentContainer !== s.contentContainer
    ) {
      s.contentContainer.add(s.contentObject);
    }
    if (s.contentObject && s.contentHeight === 0) {
      const obj = s.contentObject as unknown as { height?: number };
      const detected = typeof obj.height === "number" ? obj.height : 0;
      s.contentHeight = detected > 0 ? detected : 80;
    }
  }

  /** Toggle section by index. */
  toggle(index: number): void {
    if (index < 0 || index >= this.sections.length) return;
    const next = computeNextExpanded(
      this.expandedIndices,
      index,
      this.allowMultiple,
    );
    if (next.has(index)) this.materializeContent(index);
    this.expandedIndices = next;
    for (const s of this.sections) {
      s.expanded = next.has(s.index);
    }
    this.relayout(true);
  }

  /** Returns current expanded section indices (sorted ascending). */
  getExpanded(): number[] {
    return [...this.expandedIndices].sort((a, b) => a - b);
  }

  /** Total laid-out height (px). Useful for parent layout. */
  getTotalHeight(): number {
    let h = 0;
    for (const s of this.sections) {
      h += this.headerHeight;
      if (s.expanded) h += s.contentHeight;
    }
    return h;
  }

  private relayout(animate: boolean): void {
    let y = 0;
    for (const s of this.sections) {
      s.header.setPosition(0, y);
      y += this.headerHeight;
      s.contentContainer.setPosition(0, y);
      const targetH = s.expanded ? s.contentHeight : 0;
      const targetChevronRot = s.expanded ? Math.PI / 2 : 0;
      s.chevron.setVisible(true);
      if (animate) {
        this.scene.tweens.add({
          targets: s.contentContainer,
          height: targetH,
          duration: this.durationMs,
          ease: "Sine.easeInOut",
        });
        this.scene.tweens.add({
          targets: s.contentContainer,
          alpha: s.expanded ? 1 : 0,
          duration: this.durationMs,
          ease: "Sine.easeInOut",
        });
        this.scene.tweens.add({
          targets: s.chevron,
          rotation: targetChevronRot,
          duration: this.durationMs,
          ease: "Sine.easeInOut",
        });
      } else {
        s.contentContainer.setSize(this.widthPx, targetH);
        s.contentContainer.setAlpha(s.expanded ? 1 : 0);
        s.chevron.setRotation(targetChevronRot);
      }
      s.contentContainer.setVisible(true);
      y += targetH;
    }
    this.setSize(this.widthPx, y);
  }
}
