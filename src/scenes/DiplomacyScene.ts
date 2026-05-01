import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { portraitLoader } from "../game/PortraitLoader.ts";
import { getAmbassadorTextureKey } from "../data/ambassadorPortraits.ts";
import type {
  AICompany,
  Empire,
  GameState,
  QueuedDiplomacyAction,
} from "../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../data/types.ts";
import { cooldownKey, isOnCooldown } from "../game/diplomacy/Cooldowns.ts";
import { getStandingTier } from "../game/diplomacy/StandingTiers.ts";
import {
  Button,
  DataTable,
  Label,
  Panel,
  ScrollFrame,
  createStarfield,
  getLayout,
  getTheme,
} from "../ui/index.ts";
import type { StandingTierName } from "../game/diplomacy/StandingTiers.ts";
import {
  buildQueuedAction,
  describeActionEffect,
  detectTierShifts,
  evaluateActionState,
  getActionsForEmpire,
  getActionsForRival,
  getActiveTagBadges,
  getAmbientGreeting,
  getPerTurnCap,
  getSubjectCandidates,
  getTierColorName,
  snapshotTiers,
  type HubActionDescriptor,
  type TierColorName,
} from "./diplomacyHubHelpers.ts";

const REPUTATION_THROTTLE_THRESHOLD = 75;
const THROTTLE_BASE = 2;
const THROTTLE_HIGH = 3;

type Selection =
  | { kind: "empire"; id: string }
  | { kind: "rival"; id: string }
  | null;

type PanelMode =
  | { kind: "list" }
  | {
      kind: "subjectPicker";
      action: HubActionDescriptor;
      targetId: string;
    }
  | {
      kind: "pairPicker";
      action: HubActionDescriptor;
      targetId: string;
      selected: readonly string[];
    }
  | {
      kind: "confirm";
      action: HubActionDescriptor;
      targetId: string;
    };

/**
 * Pure helper: queue a diplomacy action onto the game state. Throws if the
 * (action, target) pair is on cooldown or the per-turn cap is reached. The
 * simulator drains the queue during the next simulation phase.
 */
export function queueDiplomacyAction(
  state: GameState,
  action: QueuedDiplomacyAction,
): GameState {
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  const key = cooldownKey(action.kind, action.targetId, action.subjectId);
  if (isOnCooldown(d.cooldowns, key, state.turn)) {
    throw new Error(`Action on cooldown: ${key}`);
  }
  const cap =
    (state.reputation ?? 0) >= REPUTATION_THROTTLE_THRESHOLD
      ? THROTTLE_HIGH
      : THROTTLE_BASE;
  if (d.queuedActions.length >= cap) {
    throw new Error("Per-turn diplomacy cap reached");
  }
  return {
    ...state,
    diplomacy: { ...d, queuedActions: [...d.queuedActions, action] },
  };
}

interface TargetRow {
  rowKind: "empire" | "rival";
  id: string;
  name: string;
  tier: string;
  standing: number;
  tags: string;
  empireRef?: string;
}

/**
 * Foreign Relations hub — v1.
 *
 * Player workflow:
 *  - Pick a target (empire or rival) from the left table.
 *  - Action buttons appear in the right pane with cost, cooldown, and cap
 *    awareness; clicking queues the action via `queueDiplomacyAction`.
 *  - The header counter shows queued/cap; once at the cap, all action
 *    buttons disable.
 *
 * Verbs in v1: gift (empire/rival) + surveil (rival, three lens variants).
 * Lobby and propose-non-compete need multi-target pickers and ship in v2.
 */
export class DiplomacyScene extends Phaser.Scene {
  private targetTable!: DataTable;
  private actionPanel!: Panel;
  private actionButtons: Button[] = [];
  private tagDetailLabels: Phaser.GameObjects.Text[] = [];
  /**
   * Persistent ambassador portrait image. Placed by `renderAmbassadorPortrait`
   * and kept across re-renders (we reuse the same Image and just swap its
   * texture) so the load cost is paid once per portrait per scene session.
   */
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private portraitFrame: Phaser.GameObjects.Rectangle | null = null;
  /**
   * Texture key currently requested by `renderAmbassadorPortrait`. Used to
   * detect stale async load callbacks when the player switches targets while
   * a portrait is still loading — only the most recent request should win.
   */
  private requestedPortraitTexture: string | null = null;
  private actionStatusLabel!: Label;
  private headerCounter!: Label;
  private queuedSummary!: Label;
  private selection: Selection = null;
  private mode: PanelMode = { kind: "list" };
  private storeUnsub: (() => void) | null = null;
  /**
   * Tier-by-id snapshot from the previous render. The next render diffs
   * against this to surface ↑/↓ arrows on shifted tier cells. `null` on
   * first render — no shifts to surface yet.
   */
  private lastTierSnapshot: Record<string, StandingTierName> | null = null;
  /** Per-target shift direction surfaced in the current render. */
  private currentShifts: Record<string, "up" | "down"> = {};

  constructor() {
    super({ key: "DiplomacyScene" });
  }

  create(): void {
    const L = getLayout();
    createStarfield(this);

    this.buildHeader(L);
    this.buildTargetTable(L);
    this.buildActionPanel(L);
    this.refreshFromState();

    const onChange = (): void => this.refreshFromState();
    gameStore.on("stateChanged", onChange);
    this.storeUnsub = (): void => {
      gameStore.off("stateChanged", onChange);
    };
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.storeUnsub?.();
      this.storeUnsub = null;
    });
  }

  // ─── Layout builders ────────────────────────────────────────────────────

  private buildHeader(L: ReturnType<typeof getLayout>): void {
    new Label(this, {
      x: L.mainContentLeft,
      y: L.contentTop - 28,
      text: "Foreign Relations",
      style: "heading",
    });
    this.headerCounter = new Label(this, {
      x: L.mainContentLeft + L.mainContentWidth - 8,
      y: L.contentTop - 28,
      text: "Actions: 0/2",
      style: "caption",
    });
    this.headerCounter.setOrigin(1, 0);
  }

  private buildTargetTable(L: ReturnType<typeof getLayout>): void {
    const tableW = Math.floor(L.mainContentWidth * 0.55);
    const tablePanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: tableW,
      height: L.contentHeight,
      title: "Targets",
    });
    const content = tablePanel.getContentArea();
    const absX = L.mainContentLeft + content.x;
    const absY = L.contentTop + content.y;

    const frame = new ScrollFrame(this, {
      x: absX,
      y: absY,
      width: content.width,
      height: content.height - 16,
    });
    this.targetTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: content.width,
      height: content.height - 16,
      contentSized: true,
      columns: [
        { key: "type", label: "Type", width: 50 },
        { key: "name", label: "Name", width: 140 },
        {
          key: "tier",
          label: "Tier",
          width: 90,
          colorFn: (value) => tierColorForCell(String(value ?? "")),
        },
        { key: "standing", label: "#", width: 30, align: "right" },
        { key: "tags", label: "Tags", width: 140 },
      ],
      onRowSelect: (_idx, row) => {
        const kind = row["rowKind"] as "empire" | "rival";
        const id = row["id"] as string;
        this.selection = { kind, id };
        // Switching targets always exits any picker.
        this.mode = { kind: "list" };
        this.refreshActionPanel();
      },
    });
    frame.setContent(this.targetTable);
  }

  private buildActionPanel(L: ReturnType<typeof getLayout>): void {
    const panelX =
      L.mainContentLeft + Math.floor(L.mainContentWidth * 0.55) + 8;
    const panelW =
      L.mainContentWidth - Math.floor(L.mainContentWidth * 0.55) - 8;
    this.actionPanel = new Panel(this, {
      x: panelX,
      y: L.contentTop,
      width: panelW,
      height: L.contentHeight,
      title: "Actions",
    });
    const content = this.actionPanel.getContentArea();
    const absX = panelX + content.x;
    const absY = L.contentTop + content.y;

    this.actionStatusLabel = new Label(this, {
      x: absX,
      y: absY,
      text: "Pick a target on the left to see available actions.",
      style: "caption",
    });

    this.queuedSummary = new Label(this, {
      x: absX,
      y: absY + content.height - 24,
      text: "",
      style: "caption",
    });
  }

  // ─── State sync ─────────────────────────────────────────────────────────

  private refreshFromState(): void {
    const state = gameStore.getState();
    this.refreshHeader(state);
    this.refreshTargetTable(state);
    this.refreshActionPanel();
    this.refreshQueuedSummary(state);
  }

  private refreshHeader(state: GameState): void {
    const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
    const cap = getPerTurnCap(state);
    const used = d.queuedActions.length;
    this.headerCounter.setText(`Actions: ${used}/${cap}`);
    const theme = getTheme();
    this.headerCounter.setColor(
      used >= cap
        ? colorToHex(theme.colors.warning)
        : colorToHex(theme.colors.textDim),
    );
  }

  private refreshTargetTable(state: GameState): void {
    const empires = state.galaxy?.empires ?? [];
    const rivals = state.aiCompanies ?? [];
    const playerId = state.playerEmpireId;
    const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;

    // Detect tier shifts since the last render. On first render
    // (`lastTierSnapshot === null`) there's nothing to compare against, so
    // no arrows surface — they only appear after the first state mutation.
    const currentSnap = snapshotTiers(state);
    if (this.lastTierSnapshot !== null) {
      const shifts = detectTierShifts(this.lastTierSnapshot, currentSnap);
      // Merge into the persistent shift map. Shifts persist visually
      // across re-renders within this scene session — only cleared when
      // a target's tier flips back or the scene is destroyed/recreated.
      for (const s of shifts) {
        this.currentShifts[s.id] = s.direction;
      }
    }
    this.lastTierSnapshot = currentSnap;

    const turn = state.turn;
    const empireRows: TargetRow[] = empires
      .filter((e) => e.id !== playerId)
      .map((e: Empire) => {
        const standing = state.empireReputation?.[e.id] ?? 50;
        const badges = getActiveTagBadges(d.empireTags[e.id] ?? [], turn);
        return {
          rowKind: "empire",
          id: e.id,
          name: e.name,
          tier: tierWithShiftArrow(
            getStandingTier(standing),
            this.currentShifts[e.id],
          ),
          standing,
          tags: badges.map((b) => b.label).join(" · "),
        };
      });
    const rivalRows: TargetRow[] = rivals
      .filter((r) => !r.bankrupt)
      .map((r: AICompany) => {
        const standing = d.rivalStanding[r.id] ?? 50;
        const badges = getActiveTagBadges(d.rivalTags[r.id] ?? [], turn);
        return {
          rowKind: "rival",
          id: r.id,
          name: r.name,
          tier: tierWithShiftArrow(
            getStandingTier(standing),
            this.currentShifts[r.id],
          ),
          standing,
          tags: badges.map((b) => b.label).join(" · "),
        };
      });

    const rows = [...empireRows, ...rivalRows].map((r) => ({
      ...r,
      type: r.rowKind === "empire" ? "Empire" : "Rival",
    }));
    this.targetTable.setRows(rows);
  }

  private refreshActionPanel(): void {
    // Clear previous buttons.
    for (const b of this.actionButtons) b.destroy();
    this.actionButtons = [];
    // Clear previous tag detail rows.
    for (const t of this.tagDetailLabels) t.destroy();
    this.tagDetailLabels = [];

    const state = gameStore.getState();
    if (!this.selection) {
      this.actionStatusLabel.setText(
        "Pick a target on the left to see available actions.",
      );
      return;
    }

    if (this.mode.kind === "subjectPicker") {
      this.renderSubjectPicker(state, this.mode);
      return;
    }
    if (this.mode.kind === "pairPicker") {
      this.renderPairPicker(state, this.mode);
      return;
    }
    if (this.mode.kind === "confirm") {
      this.renderConfirmPanel(state, this.mode);
      return;
    }
    this.renderActionList(state);
  }

  private renderActionList(state: GameState): void {
    const sel = this.selection;
    if (!sel) return;
    const { kind, id } = sel;
    const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
    let actions: readonly HubActionDescriptor[];
    let header: string;
    let activeTags: ReturnType<typeof getActiveTagBadges>;
    let ambassadorLine: string | null = null;
    let greetingLine: string | null = null;
    let portraitId: string | null = null;
    if (kind === "empire") {
      const empire = state.galaxy?.empires.find((e) => e.id === id);
      if (!empire) return;
      actions = getActionsForEmpire(empire, state);
      header = empire.name;
      activeTags = getActiveTagBadges(d.empireTags[id] ?? [], state.turn);
      const amb = d.empireAmbassadors[id];
      if (amb) {
        ambassadorLine = `Ambassador ${amb.name} · ${amb.personality}`;
        const tier = getStandingTier(state.empireReputation?.[id] ?? 50);
        greetingLine = getAmbientGreeting(amb.personality, tier);
        portraitId = amb.portrait.portraitId;
      }
    } else {
      const rival = state.aiCompanies?.find((r) => r.id === id);
      if (!rival) return;
      actions = getActionsForRival(rival);
      header = rival.name;
      activeTags = getActiveTagBadges(d.rivalTags[id] ?? [], state.turn);
      const liaison = d.rivalLiaisons[id];
      if (liaison) {
        ambassadorLine = `Liaison ${liaison.name} · ${liaison.personality}`;
        const tier = getStandingTier(d.rivalStanding[id] ?? 50);
        greetingLine = getAmbientGreeting(liaison.personality, tier);
        portraitId = liaison.portrait.portraitId;
      }
    }

    this.actionStatusLabel.setText(header);

    const { absX, absY, contentWidth } = this.getActionPanelGeometry();
    // Portrait sits above the ambassador name; if loaded, ambassador rows
    // start beneath it.
    const portraitBottom = this.renderAmbassadorPortrait(
      portraitId,
      absX,
      absY,
    );
    const ambStartY = portraitBottom > absY ? portraitBottom + 6 : absY;
    // Ambassador name + ambient greeting render between the portrait and
    // the tag detail rows. We reuse `tagDetailLabels` for lifecycle
    // management since the cleanup loop in refreshActionPanel destroys
    // all of them on each pass.
    const ambassadorBottom = this.renderAmbassadorRows(
      ambassadorLine,
      greetingLine,
      absX,
      ambStartY,
      contentWidth - 16,
    );
    const tagRowGap = 18;
    const tagsStartY = ambassadorBottom > absY ? ambassadorBottom + 6 : absY;
    const tagRowsBottom = this.renderTagDetailRows(
      activeTags,
      absX,
      tagsStartY,
      contentWidth - 16,
      tagRowGap,
    );

    const btnH = 36;
    const btnGap = 6;
    const yOffset = tagRowsBottom > absY ? tagRowsBottom - absY + 8 : 0;

    actions.forEach((action, i) => {
      const evalState = evaluateActionState(action, id, state);
      const disabledSuffix = !evalState.enabled
        ? evalState.reasonIfDisabled === "cooldown"
          ? ` (cd ${evalState.cooldownTurnsRemaining ?? "?"}t)`
          : evalState.reasonIfDisabled === "cap"
            ? " (cap)"
            : evalState.reasonIfDisabled === "cash"
              ? " (low cash)"
              : ""
        : "";
      const affordanceSuffix =
        evalState.enabled && evalState.affordanceHint
          ? ` · ${evalState.affordanceHint}`
          : "";
      const costText =
        action.cashCost > 0 ? ` — $${formatCash(action.cashCost)}` : "";
      const label = `${action.label}${costText}${disabledSuffix}${affordanceSuffix}`;
      const btn = new Button(this, {
        x: absX,
        y: absY + yOffset + i * (btnH + btnGap),
        width: contentWidth - 16,
        height: btnH,
        label,
        disabled: !evalState.enabled,
        onClick: () => this.handleActionClick(action, id),
      });
      this.actionButtons.push(btn);
    });
  }

  private renderSubjectPicker(
    state: GameState,
    mode: { action: HubActionDescriptor; targetId: string },
  ): void {
    this.actionStatusLabel.setText(
      mode.action.subjectPrompt ?? "Pick a subject:",
    );
    const candidates = getSubjectCandidates(mode.action, state);
    const { absX, absY, contentWidth } = this.getActionPanelGeometry();
    const btnH = 32;
    const btnGap = 4;

    candidates.forEach((cand, i) => {
      const btn = new Button(this, {
        x: absX,
        y: absY + i * (btnH + btnGap),
        width: contentWidth - 16,
        height: btnH,
        label: cand.name,
        onClick: () =>
          this.handleSubjectChosen(mode.action, mode.targetId, cand.id),
      });
      this.actionButtons.push(btn);
    });

    const cancelBtn = new Button(this, {
      x: absX,
      y: absY + candidates.length * (btnH + btnGap) + 8,
      width: contentWidth - 16,
      height: btnH,
      label: "Cancel",
      onClick: () => {
        this.mode = { kind: "list" };
        this.refreshActionPanel();
      },
    });
    this.actionButtons.push(cancelBtn);
  }

  private renderPairPicker(
    state: GameState,
    mode: {
      action: HubActionDescriptor;
      targetId: string;
      selected: readonly string[];
    },
  ): void {
    const need = 2;
    const have = mode.selected.length;
    const promptBase = mode.action.subjectPrompt ?? "Pick two subjects:";
    this.actionStatusLabel.setText(`${promptBase} (${have}/${need} chosen)`);
    const candidates = getSubjectCandidates(mode.action, state);
    const { absX, absY, contentWidth } = this.getActionPanelGeometry();
    const btnH = 30;
    const btnGap = 3;

    candidates.forEach((cand, i) => {
      const isSelected = mode.selected.includes(cand.id);
      const isMaxed = !isSelected && have >= need;
      const label = isSelected ? `[x] ${cand.name}` : `[ ] ${cand.name}`;
      const btn = new Button(this, {
        x: absX,
        y: absY + i * (btnH + btnGap),
        width: contentWidth - 16,
        height: btnH,
        label,
        disabled: isMaxed,
        onClick: () => this.togglePairSelection(cand.id),
      });
      this.actionButtons.push(btn);
    });

    const baseY = absY + candidates.length * (btnH + btnGap) + 8;
    const confirmBtn = new Button(this, {
      x: absX,
      y: baseY,
      width: Math.floor((contentWidth - 24) / 2),
      height: btnH,
      label: have === need ? "Confirm" : `Confirm (${have}/${need})`,
      disabled: have !== need,
      onClick: () =>
        this.handlePairConfirmed(mode.action, mode.targetId, mode.selected),
    });
    this.actionButtons.push(confirmBtn);

    const cancelBtn = new Button(this, {
      x: absX + Math.floor((contentWidth - 24) / 2) + 8,
      y: baseY,
      width: Math.floor((contentWidth - 24) / 2),
      height: btnH,
      label: "Cancel",
      onClick: () => {
        this.mode = { kind: "list" };
        this.refreshActionPanel();
      },
    });
    this.actionButtons.push(cancelBtn);
  }

  /**
   * Confirm panel for single-category actions (Send Gift, Surveil X,
   * Sabotage). The action list button doesn't queue immediately — it routes
   * here so the player sees a short effect summary and an explicit cost
   * line before committing the spend.
   */
  private renderConfirmPanel(
    state: GameState,
    mode: { action: HubActionDescriptor; targetId: string },
  ): void {
    const { action, targetId } = mode;
    // Header restates the action so it's always visible above the buttons.
    let targetName = targetId;
    if (this.selection?.kind === "empire") {
      const e = state.galaxy?.empires.find((x) => x.id === targetId);
      if (e) targetName = e.name;
    } else if (this.selection?.kind === "rival") {
      const r = state.aiCompanies?.find((x) => x.id === targetId);
      if (r) targetName = r.name;
    }
    this.actionStatusLabel.setText(`${action.label} — ${targetName}?`);

    const { absX, absY, contentWidth } = this.getActionPanelGeometry();
    const theme = getTheme();

    // Effect summary line. Falls back to the bare label if the action kind
    // isn't a known single-category one (defensive — shouldn't happen).
    const effect = describeActionEffect(action) ?? action.label;
    const effectLabel = this.add.text(absX, absY, effect, {
      fontFamily: theme.fonts.body.family,
      fontSize: "13px",
      color: colorToHex(theme.colors.text),
      wordWrap: { width: contentWidth - 16 },
    });
    this.tagDetailLabels.push(effectLabel);

    // Cost line — explicit second row so the spend is unambiguous.
    const costText =
      action.cashCost > 0
        ? `Cost: $${formatCash(action.cashCost)}`
        : "Cost: free";
    const costLabel = this.add.text(
      absX,
      absY + effectLabel.height + 6,
      costText,
      {
        fontFamily: theme.fonts.value.family,
        fontSize: "13px",
        color: colorToHex(theme.colors.accent),
      },
    );
    this.tagDetailLabels.push(costLabel);

    // Affordance hint, if any (e.g. "+15% favor" / "-50% dampener").
    const evalState = evaluateActionState(action, targetId, state);
    let nextY = absY + effectLabel.height + 6 + costLabel.height + 4;
    if (evalState.affordanceHint) {
      const hint = this.add.text(absX, nextY, evalState.affordanceHint, {
        fontFamily: theme.fonts.caption.family,
        fontSize: "12px",
        color: colorToHex(theme.colors.textDim),
      });
      this.tagDetailLabels.push(hint);
      nextY += hint.height + 4;
    }

    // Confirm + Cancel sit on a shared row so the layout matches the pair
    // picker's "Confirm | Cancel" footer.
    const btnH = 36;
    const btnY = nextY + 8;
    const btnW = Math.floor((contentWidth - 24) / 2);
    const confirmBtn = new Button(this, {
      x: absX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Confirm",
      onClick: () => {
        this.queueAction(action, targetId);
        this.mode = { kind: "list" };
        // refresh handled by gameStore.stateChanged subscription
      },
    });
    this.actionButtons.push(confirmBtn);

    const cancelBtn = new Button(this, {
      x: absX + btnW + 8,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Cancel",
      onClick: () => {
        this.mode = { kind: "list" };
        this.refreshActionPanel();
      },
    });
    this.actionButtons.push(cancelBtn);
  }

  /**
   * Renders one Phaser.Text per active tag below the action header. Each row
   * shows `<label> — <tooltip>` colored by the tag's intent. Returns the y
   * coordinate of the bottom of the last rendered row, so the caller can
   * push subsequent UI (action buttons) down beneath.
   */
  /**
   * Render the ambassador portrait image above the ambassador text rows.
   * The image lives across re-renders — we reuse the same Phaser.Image
   * instance and just swap its texture key as the player switches targets.
   * The portrait texture loads asynchronously via `portraitLoader`; until
   * it's in Phaser's TextureManager, the image stays hidden so we don't
   * flash a placeholder.
   *
   * Returns the y of the bottom of the portrait frame (or `yStart` if no
   * portrait is rendered) so subsequent UI can stack beneath.
   */
  private renderAmbassadorPortrait(
    portraitId: string | null,
    x: number,
    yStart: number,
  ): number {
    const SIZE = 72;
    if (!portraitId) {
      this.requestedPortraitTexture = null;
      this.portraitImage?.setVisible(false);
      this.portraitFrame?.setVisible(false);
      return yStart;
    }
    const theme = getTheme();
    const cx = x + SIZE / 2;
    const cy = yStart + SIZE / 2;
    const textureKey = getAmbassadorTextureKey(portraitId);
    this.requestedPortraitTexture = textureKey;

    if (!this.portraitFrame) {
      this.portraitFrame = this.add
        .rectangle(cx, cy, SIZE + 4, SIZE + 4, 0x000000, 0)
        .setStrokeStyle(1, theme.colors.accent, 0.7);
    } else {
      this.portraitFrame.setPosition(cx, cy).setVisible(true);
    }

    if (this.portraitImage) {
      this.portraitImage.setPosition(cx, cy).setVisible(true);
    }

    if (this.textures.exists(textureKey)) {
      // Texture already in TextureManager — set immediately.
      if (!this.portraitImage) {
        this.portraitImage = this.add
          .image(cx, cy, textureKey)
          .setDisplaySize(SIZE, SIZE);
      } else {
        this.portraitImage.setTexture(textureKey).setDisplaySize(SIZE, SIZE);
      }
    } else {
      // Hide while loading; swap texture in once loaded. The selection may
      // change before the load completes — guard by re-checking that the
      // load result still matches the current portrait.
      this.portraitImage?.setVisible(false);
      portraitLoader
        .ensureAmbassadorPortrait(this, portraitId)
        .then((key) => {
          // If the player switched targets while we were loading, the
          // requested texture key has moved on — skip the swap so the
          // current (newer) request wins.
          if (this.requestedPortraitTexture !== key) return;
          if (!this.portraitImage) {
            this.portraitImage = this.add
              .image(cx, cy, key)
              .setDisplaySize(SIZE, SIZE);
          } else {
            this.portraitImage.setTexture(key).setDisplaySize(SIZE, SIZE);
          }
          this.portraitImage.setVisible(true);
        })
        .catch(() => {
          // Load failed (missing asset / 404). Leave the frame visible and
          // the image hidden — the ambassador text below still tells the
          // player who they're talking to.
        });
    }

    return yStart + SIZE + 4;
  }

  /**
   * Renders two text rows below the action header: the ambassador's name
   * and personality, then a single ambient greeting line keyed to their
   * `(personality, tier)`. Returns the y-coordinate of the bottom of the
   * last rendered row so subsequent UI can stack beneath. If both inputs
   * are null (no ambassador on this target — e.g. the player's own empire
   * before that case is filtered), returns `yStart` unchanged.
   */
  private renderAmbassadorRows(
    ambassadorLine: string | null,
    greetingLine: string | null,
    x: number,
    yStart: number,
    maxWidth: number,
  ): number {
    if (!ambassadorLine && !greetingLine) return yStart;
    const theme = getTheme();
    let y = yStart;
    if (ambassadorLine) {
      const lbl = this.add.text(x, y, ambassadorLine, {
        fontFamily: "sans-serif",
        fontSize: "12px",
        color: colorToHex(theme.colors.text),
        fontStyle: "italic",
      });
      this.tagDetailLabels.push(lbl);
      y += lbl.height + 2;
    }
    if (greetingLine) {
      const lbl = this.add.text(x, y, greetingLine, {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: colorToHex(theme.colors.textDim),
        wordWrap: { width: maxWidth },
      });
      this.tagDetailLabels.push(lbl);
      y += lbl.height + 2;
    }
    return y;
  }

  private renderTagDetailRows(
    tags: ReturnType<typeof getActiveTagBadges>,
    x: number,
    yStart: number,
    maxWidth: number,
    rowHeight: number,
  ): number {
    if (tags.length === 0) return yStart;
    const theme = getTheme();
    const colorByIntent: Record<"good" | "bad" | "neutral", number> = {
      good: theme.colors.profit,
      bad: theme.colors.warning,
      neutral: theme.colors.accent,
    };
    let y = yStart;
    for (const t of tags) {
      const text = `${t.label} — ${t.tooltip}`;
      const lbl = this.add.text(x, y, text, {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: colorToHex(colorByIntent[t.intent]),
        wordWrap: { width: maxWidth },
      });
      this.tagDetailLabels.push(lbl);
      // wrap may produce multiple visual lines; advance y by the actual
      // rendered height plus a small gap.
      y += Math.max(rowHeight, lbl.height + 2);
    }
    return y;
  }

  private getActionPanelGeometry(): {
    absX: number;
    absY: number;
    contentWidth: number;
  } {
    const L = getLayout();
    const panelX =
      L.mainContentLeft + Math.floor(L.mainContentWidth * 0.55) + 8;
    const content = this.actionPanel.getContentArea();
    return {
      absX: panelX + content.x,
      absY: L.contentTop + content.y + 28,
      contentWidth: content.width,
    };
  }

  private refreshQueuedSummary(state: GameState): void {
    const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
    if (d.queuedActions.length === 0) {
      this.queuedSummary.setText("");
      return;
    }
    const nameById: Record<string, string> = {};
    for (const e of state.galaxy?.empires ?? []) nameById[e.id] = e.name;
    for (const r of state.aiCompanies ?? []) nameById[r.id] = r.name;
    const verbLabel: Record<string, string> = {
      giftEmpire: "Gift",
      giftRival: "Gift",
      lobbyFor: "Lobby for",
      lobbyAgainst: "Lobby against",
      proposeNonCompete: "Non-Compete",
      surveil: "Surveil",
      sabotage: "Sabotage",
    };
    const lines = d.queuedActions
      .map((a) => {
        const verb = verbLabel[a.kind] ?? a.kind;
        const target = nameById[a.targetId] ?? a.targetId;
        return `• ${verb} → ${target}`;
      })
      .join("\n");
    this.queuedSummary.setText(`Queued this turn:\n${lines}`);
  }

  // ─── Action handlers ────────────────────────────────────────────────────

  private handleActionClick(
    action: HubActionDescriptor,
    targetId: string,
  ): void {
    if (action.category === "single") {
      // Send Gift / Surveil / Sabotage cost cash and have no picker step,
      // so a stray click would otherwise spend the player's money silently.
      // Route through a confirm panel so the action is always intentional.
      this.mode = { kind: "confirm", action, targetId };
      this.refreshActionPanel();
      return;
    }
    if (action.category === "subject") {
      this.mode = { kind: "subjectPicker", action, targetId };
      this.refreshActionPanel();
      return;
    }
    if (action.category === "pair") {
      this.mode = { kind: "pairPicker", action, targetId, selected: [] };
      this.refreshActionPanel();
      return;
    }
  }

  private handleSubjectChosen(
    action: HubActionDescriptor,
    targetId: string,
    subjectId: string,
  ): void {
    this.queueAction(action, targetId, { subjectId });
    this.mode = { kind: "list" };
    // refresh handled by gameStore.stateChanged subscription
  }

  private togglePairSelection(candidateId: string): void {
    if (this.mode.kind !== "pairPicker") return;
    const cur = this.mode.selected;
    let next: string[];
    if (cur.includes(candidateId)) {
      next = cur.filter((id) => id !== candidateId);
    } else if (cur.length < 2) {
      next = [...cur, candidateId];
    } else {
      next = [...cur]; // already at max — buttons should already be disabled
    }
    this.mode = { ...this.mode, selected: next };
    this.refreshActionPanel();
  }

  private handlePairConfirmed(
    action: HubActionDescriptor,
    targetId: string,
    selected: readonly string[],
  ): void {
    if (selected.length !== 2) return;
    this.queueAction(action, targetId, {
      subjectId: selected[0],
      subjectIdSecondary: selected[1],
    });
    this.mode = { kind: "list" };
  }

  private queueAction(
    action: HubActionDescriptor,
    targetId: string,
    subjects: { subjectId?: string; subjectIdSecondary?: string } = {},
  ): void {
    const state = gameStore.getState();
    try {
      const queued = buildQueuedAction(action, targetId, state.turn, subjects);
      gameStore.setState(queueDiplomacyAction(state, queued));
    } catch (err) {
      // Disabled-state UI should normally prevent reaching here; keep a
      // defensive log so unexpected races (e.g. concurrent state updates)
      // surface during dev.
      console.warn("[DiplomacyScene] queue rejected:", err);
    }
  }
}

function colorToHex(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

function formatCash(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

/**
 * Append a ↑/↓ arrow to a tier label when the row's tier shifted since the
 * last render. The arrow lives inside the cell value so the existing
 * `colorFn` keeps coloring by tier — `tierColorForCell` strips the arrow
 * before doing the tier match.
 */
function tierWithShiftArrow(
  tier: StandingTierName,
  shift: "up" | "down" | undefined,
): string {
  if (shift === "up") return `${tier} ↑`;
  if (shift === "down") return `${tier} ↓`;
  return tier;
}

/**
 * Map a tier label (rendered in the Tier column) to the live theme color
 * the cell should use. Strips any ↑/↓ shift arrow before matching so the
 * coloring stays consistent regardless of whether a shift indicator is
 * present. Returns null for unknown values so the column falls back to
 * the default text color rather than turning white-on-white.
 */
function tierColorForCell(tierLabel: string): number | null {
  const theme = getTheme();
  const colorByName: Record<TierColorName, number> = {
    danger: theme.colors.loss,
    warning: theme.colors.warning,
    muted: theme.colors.textDim,
    accent: theme.colors.accent,
    highlight: theme.colors.profit,
  };
  // Strip the optional " ↑" / " ↓" shift suffix so the switch matches.
  const base = tierLabel.replace(/\s*[↑↓]\s*$/, "").trim();
  switch (base) {
    case "Hostile":
      return colorByName[getTierColorName("Hostile")];
    case "Cold":
      return colorByName[getTierColorName("Cold")];
    case "Neutral":
      return colorByName[getTierColorName("Neutral")];
    case "Warm":
      return colorByName[getTierColorName("Warm")];
    case "Allied":
      return colorByName[getTierColorName("Allied")];
    default:
      return null;
  }
}
