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
  getPerTurnCap,
  type HubActionDescriptor,
} from "./diplomacyHubHelpers.ts";

const REPUTATION_THROTTLE_THRESHOLD = 75;
const THROTTLE_BASE = 2;
const THROTTLE_HIGH = 3;

type Selection =
  | { kind: "empire"; id: string }
  | { kind: "rival"; id: string }
  | null;

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
        { key: "type", label: "Type", width: 60 },
        { key: "name", label: "Name", width: 180 },
        { key: "tier", label: "Tier", width: 80 },
        { key: "standing", label: "Standing", width: 80, align: "right" },
      ],
      onRowSelect: (_idx, row) => {
        const kind = row["rowKind"] as "empire" | "rival";
        const id = row["id"] as string;
        this.selection = { kind, id };
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

    const empireRows: TargetRow[] = empires
      .filter((e) => e.id !== playerId)
      .map((e: Empire) => {
        const standing = state.empireReputation?.[e.id] ?? 50;
        return {
          rowKind: "empire",
          id: e.id,
          name: e.name,
          tier: getStandingTier(standing),
          standing,
        };
      });
    const rivalRows: TargetRow[] = rivals
      .filter((r) => !r.bankrupt)
      .map((r: AICompany) => {
        const standing = d.rivalStanding[r.id] ?? 50;
        return {
          rowKind: "rival",
          id: r.id,
          name: r.name,
          tier: getStandingTier(standing),
          standing,
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

    const { kind, id } = this.selection;
    let actions: readonly HubActionDescriptor[];
    let header: string;
    if (kind === "empire") {
      const empire = state.galaxy?.empires.find((e) => e.id === id);
      if (!empire) return;
      actions = getActionsForEmpire(empire, state);
      header = empire.name;
    } else {
      const rival = state.aiCompanies?.find((r) => r.id === id);
      if (!rival) return;
      actions = getActionsForRival(rival);
      header = rival.name;
    }

    this.actionStatusLabel.setText(header);

    const L = getLayout();
    const panelX =
      L.mainContentLeft + Math.floor(L.mainContentWidth * 0.55) + 8;
    const content = this.actionPanel.getContentArea();
    const absX = panelX + content.x;
    const absY = L.contentTop + content.y + 28;
    const btnH = 36;
    const btnGap = 8;

    actions.forEach((action, i) => {
      const evalState = evaluateActionState(action, id, state);
      const suffix = !evalState.enabled
        ? evalState.reasonIfDisabled === "cooldown"
          ? ` (cd ${evalState.cooldownTurnsRemaining ?? "?"}t)`
          : evalState.reasonIfDisabled === "cap"
            ? " (cap)"
            : evalState.reasonIfDisabled === "cash"
              ? " (low cash)"
              : ""
        : "";
      const label = `${action.label} — $${formatCash(action.cashCost)}${suffix}`;
      const btn = new Button(this, {
        x: absX,
        y: absY + i * (btnH + btnGap),
        width: content.width - 16,
        height: btnH,
        label,
        disabled: !evalState.enabled,
        onClick: () => this.handleQueue(action, id),
      });
      this.actionButtons.push(btn);
    });
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

  // ─── Action handler ─────────────────────────────────────────────────────

  private handleQueue(action: HubActionDescriptor, targetId: string): void {
    const state = gameStore.getState();
    try {
      const queued = buildQueuedAction(action, targetId, state.turn);
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
