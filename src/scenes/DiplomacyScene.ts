import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
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
import {
  buildQueuedAction,
  evaluateActionState,
  getActionsForEmpire,
  getActionsForRival,
  getActiveTagBadges,
  getPerTurnCap,
  getSubjectCandidates,
  getTierColorName,
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
  private actionStatusLabel!: Label;
  private headerCounter!: Label;
  private queuedSummary!: Label;
  private selection: Selection = null;
  private mode: PanelMode = { kind: "list" };
  private storeUnsub: (() => void) | null = null;

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
        { key: "type", label: "Type", width: 56 },
        { key: "name", label: "Name", width: 150 },
        {
          key: "tier",
          label: "Tier",
          width: 68,
          colorFn: (value) => tierColorForCell(String(value ?? "")),
        },
        { key: "standing", label: "#", width: 36, align: "right" },
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
          tier: getStandingTier(standing),
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
          tier: getStandingTier(standing),
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
    if (kind === "empire") {
      const empire = state.galaxy?.empires.find((e) => e.id === id);
      if (!empire) return;
      actions = getActionsForEmpire(empire, state);
      header = empire.name;
      activeTags = getActiveTagBadges(d.empireTags[id] ?? [], state.turn);
    } else {
      const rival = state.aiCompanies?.find((r) => r.id === id);
      if (!rival) return;
      actions = getActionsForRival(rival);
      header = rival.name;
      activeTags = getActiveTagBadges(d.rivalTags[id] ?? [], state.turn);
    }

    const headerWithTags =
      activeTags.length > 0
        ? `${header}\nTags: ${activeTags.map((t) => t.label).join(" · ")}`
        : header;
    this.actionStatusLabel.setText(headerWithTags);

    const { absX, absY, contentWidth } = this.getActionPanelGeometry();
    const btnH = 36;
    const btnGap = 6;
    // When tags are shown, push the action buttons down by one line so they
    // don't collide with the wrapped header.
    const yOffset = activeTags.length > 0 ? 18 : 0;

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
      this.queueAction(action, targetId);
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
 * Map a tier label (rendered in the Tier column) to the live theme color
 * the cell should use. Returns null for unknown values so the column falls
 * back to the default text color rather than turning white-on-white.
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
  switch (tierLabel) {
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
