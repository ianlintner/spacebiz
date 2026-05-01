import type {
  AICompany,
  AmbassadorPersonality,
  DiplomacyActionKind,
  Empire,
  GameState,
  QueuedDiplomacyAction,
  StandingTag,
  SurveilLens,
} from "../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../data/types.ts";
import { cooldownKey, isOnCooldown } from "../game/diplomacy/Cooldowns.ts";
import { hasTagOfKind } from "../game/diplomacy/StandingTags.ts";
import {
  getStandingTier,
  type StandingTierName,
} from "../game/diplomacy/StandingTiers.ts";

export const HUB_THROTTLE_BASE = 2;
export const HUB_THROTTLE_HIGH = 3;
export const HUB_REPUTATION_THRESHOLD = 75;

const GIFT_EMPIRE_BASE = 5_000;
const GIFT_EMPIRE_PER_SYSTEM = 1_500;
const GIFT_EMPIRE_CAP = 20_000;
const GIFT_RIVAL_COST = 5_000;
const SURVEIL_COST = 15_000;
const LOBBY_COST = 18_000;
const NON_COMPETE_COST = 0; // proposal is free; the agreement itself binds both sides
const SABOTAGE_COST = 30_000;

/**
 * The picker shape an action requires before it can be queued:
 *  - "single"   → no extra picks needed (gift, surveil)
 *  - "subject"  → one extra subject id (lobby targets a third-party rival)
 *  - "pair"     → two extra subject ids (non-compete picks two empires to segregate)
 */
export type HubActionCategory = "single" | "subject" | "pair";

export interface HubActionDescriptor {
  readonly id: string;
  readonly kind: DiplomacyActionKind;
  readonly label: string;
  readonly cashCost: number;
  readonly category: HubActionCategory;
  readonly surveilLens?: SurveilLens;
  readonly subjectPrompt?: string; // shown above the picker (e.g. "Lobby Vex against…")
}

export interface HubActionState {
  readonly enabled: boolean;
  readonly reasonIfDisabled?: "cooldown" | "cap" | "cash";
  readonly cooldownTurnsRemaining?: number;
  /**
   * Short hint surfaced on enabled buttons describing applicable bonuses or
   * penalties (e.g. "+15% favor", "-50% dampener"). Undefined when neither
   * applies; presence does NOT change `enabled`.
   */
  readonly affordanceHint?: string;
}

export function getPerTurnCap(state: GameState): number {
  return (state.reputation ?? 0) >= HUB_REPUTATION_THRESHOLD
    ? HUB_THROTTLE_HIGH
    : HUB_THROTTLE_BASE;
}

export function computeGiftCostForEmpire(
  empire: Empire,
  state: GameState,
): number {
  const systems = state.galaxy.systems.filter(
    (s) => s.empireId === empire.id,
  ).length;
  return Math.min(
    GIFT_EMPIRE_CAP,
    GIFT_EMPIRE_BASE + systems * GIFT_EMPIRE_PER_SYSTEM,
  );
}

export function getActionsForEmpire(
  empire: Empire,
  state: GameState,
): readonly HubActionDescriptor[] {
  return [
    {
      id: `gift-${empire.id}`,
      kind: "giftEmpire",
      label: "Send Gift",
      cashCost: computeGiftCostForEmpire(empire, state),
      category: "single",
    },
    {
      id: `lobby-for-${empire.id}`,
      kind: "lobbyFor",
      label: "Lobby For…",
      cashCost: LOBBY_COST,
      category: "subject",
      subjectPrompt: `Lobby ${empire.name} for which rival?`,
    },
    {
      id: `lobby-against-${empire.id}`,
      kind: "lobbyAgainst",
      label: "Lobby Against…",
      cashCost: LOBBY_COST,
      category: "subject",
      subjectPrompt: `Lobby ${empire.name} against which rival?`,
    },
  ];
}

export function getActionsForRival(
  rival: AICompany,
): readonly HubActionDescriptor[] {
  return [
    {
      id: `gift-${rival.id}`,
      kind: "giftRival",
      label: "Send Gift",
      cashCost: GIFT_RIVAL_COST,
      category: "single",
    },
    {
      id: `surveil-cash-${rival.id}`,
      kind: "surveil",
      label: "Surveil: Cash",
      cashCost: SURVEIL_COST,
      category: "single",
      surveilLens: "cash",
    },
    {
      id: `surveil-contract-${rival.id}`,
      kind: "surveil",
      label: "Surveil: Top Contract",
      cashCost: SURVEIL_COST,
      category: "single",
      surveilLens: "topContractByValue",
    },
    {
      id: `surveil-standing-${rival.id}`,
      kind: "surveil",
      label: "Surveil: Best Ally",
      cashCost: SURVEIL_COST,
      category: "single",
      surveilLens: "topEmpireStanding",
    },
    {
      id: `non-compete-${rival.id}`,
      kind: "proposeNonCompete",
      label: "Propose Non-Compete…",
      cashCost: NON_COMPETE_COST,
      category: "pair",
      subjectPrompt: `Pick two empires for ${rival.name} to stay out of.`,
    },
    {
      id: `sabotage-${rival.id}`,
      kind: "sabotage",
      label: "Sabotage Operation",
      cashCost: SABOTAGE_COST,
      category: "single",
    },
  ];
}

export interface SubjectCandidate {
  readonly id: string;
  readonly name: string;
}

/**
 * Returns the subject pool for a multi-target action:
 *  - lobbyFor / lobbyAgainst → all non-bankrupt rivals (excluding the
 *    selected empire's own owned rivals would be a wave-3 polish)
 *  - proposeNonCompete → all empires except the player's own
 *
 * For "single"-category actions the result is empty.
 */
export function getSubjectCandidates(
  action: HubActionDescriptor,
  state: GameState,
): readonly SubjectCandidate[] {
  if (action.kind === "lobbyFor" || action.kind === "lobbyAgainst") {
    return (state.aiCompanies ?? [])
      .filter((r) => !r.bankrupt)
      .map((r) => ({ id: r.id, name: r.name }));
  }
  if (action.kind === "proposeNonCompete") {
    const playerId = state.playerEmpireId;
    return (state.galaxy?.empires ?? [])
      .filter((e) => e.id !== playerId)
      .map((e) => ({ id: e.id, name: e.name }));
  }
  return [];
}

function computeAffordanceHint(
  action: HubActionDescriptor,
  targetId: string,
  state: GameState,
): string | undefined {
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  if (action.kind === "lobbyFor" || action.kind === "lobbyAgainst") {
    const tags = d.empireTags[targetId] ?? [];
    if (hasTagOfKind(tags, "OweFavor")) return "+15% favor";
  }
  if (action.kind === "giftEmpire") {
    const anyRecent = Object.values(d.empireTags).some((tags) =>
      hasTagOfKind(tags, "RecentlyGifted"),
    );
    if (anyRecent) return "-50% dampener";
  }
  if (action.kind === "giftRival") {
    const anyRecent = Object.values(d.rivalTags).some((tags) =>
      hasTagOfKind(tags, "RecentlyGifted"),
    );
    if (anyRecent) return "-50% dampener";
  }
  return undefined;
}

export function evaluateActionState(
  action: HubActionDescriptor,
  targetId: string,
  state: GameState,
): HubActionState {
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;

  // Cap takes precedence — a cap-blocked action stays cap-blocked even if
  // it's also on cooldown, since the cap is the more useful thing for the
  // player to fix (skip a turn vs cancel something they queued).
  if (d.queuedActions.length >= getPerTurnCap(state)) {
    return { enabled: false, reasonIfDisabled: "cap" };
  }

  const key = cooldownKey(action.kind, targetId);
  const until = d.cooldowns[key];
  if (until !== undefined && isOnCooldown(d.cooldowns, key, state.turn)) {
    return {
      enabled: false,
      reasonIfDisabled: "cooldown",
      cooldownTurnsRemaining: until - state.turn,
    };
  }

  if ((state.cash ?? 0) < action.cashCost) {
    return { enabled: false, reasonIfDisabled: "cash" };
  }

  const affordanceHint = computeAffordanceHint(action, targetId, state);
  return affordanceHint ? { enabled: true, affordanceHint } : { enabled: true };
}

/**
 * Player-facing badge label and intent color for an active tag. The label is
 * kept terse (4-7 chars) so multiple badges can fit a narrow table column.
 *
 * Intents:
 *  - "good"     → friendly to the player (their relationship is favorable)
 *  - "bad"      → adverse (rival has flagged the player as a spy, etc.)
 *  - "neutral"  → informational, no value judgement
 */
export interface TagBadge {
  readonly label: string;
  readonly intent: "good" | "bad" | "neutral";
  readonly tooltip: string;
}

export function describeTag(tag: StandingTag): TagBadge {
  switch (tag.kind) {
    case "OweFavor":
      return {
        label: "Favor",
        intent: "good",
        tooltip: "Owes you a favor — boosts next eligible action's success.",
      };
    case "RecentlyGifted":
      return {
        label: "Gifted",
        intent: "neutral",
        tooltip: "Recently received a gift — cross-target dampener active.",
      };
    case "SuspectedSpy":
      return {
        label: "Spied!",
        intent: "bad",
        tooltip: "They suspect you of espionage — expect retaliation events.",
      };
    case "NonCompete":
      return {
        label: "NC",
        intent: "neutral",
        tooltip: `Non-Compete pact protecting empires: ${tag.protectedEmpireIds.join(", ")}.`,
      };
    case "LeakedIntel":
      return {
        label: `Intel:${tag.lens === "topContractByValue" ? "contract" : tag.lens}`,
        intent: "good",
        tooltip: `Surveillance leaked their ${tag.lens}: ${tag.value}`,
      };
    case "Sabotaged":
      return {
        label: "Sabotaged",
        intent: "good",
        tooltip:
          "Your operation disrupted their cash flow — expect retaliation events.",
      };
  }
}

/**
 * Returns badges for tags that haven't expired yet. Reads from
 * `expiresOnTurn > currentTurn`, matching the resolver's expiry semantic.
 */
export function getActiveTagBadges(
  tags: readonly StandingTag[],
  currentTurn: number,
): readonly TagBadge[] {
  return tags.filter((t) => t.expiresOnTurn > currentTurn).map(describeTag);
}

/**
 * Per-tier color name. The scene maps these onto the active theme; helpers
 * stay theme-agnostic so they're testable and the same names render in both
 * dark and light themes.
 */
export type TierColorName =
  | "danger"
  | "warning"
  | "muted"
  | "accent"
  | "highlight";

export function getTierColorName(tier: StandingTierName): TierColorName {
  switch (tier) {
    case "Hostile":
      return "danger";
    case "Cold":
      return "warning";
    case "Neutral":
      return "muted";
    case "Warm":
      return "accent";
    case "Allied":
      return "highlight";
  }
}

export function getTierForEmpire(
  empireId: string,
  state: GameState,
): StandingTierName {
  return getStandingTier(state.empireReputation?.[empireId] ?? 50);
}

export function getTierForRival(
  rivalId: string,
  state: GameState,
): StandingTierName {
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  return getStandingTier(d.rivalStanding[rivalId] ?? 50);
}

/**
 * Ambient greeting line for an ambassador/liaison shown when the player
 * selects their target in the hub. The pool is 4 personalities × 5 tiers =
 * 20 lines; we intentionally keep them short so the right pane stays
 * scannable rather than turning into a wall of flavor text.
 *
 * Distinct from `CopyTemplates.getFlavor` — that fires on event outcomes
 * (gift accepted, lobby succeeded, etc.). This is the *idle* line: how
 * does the ambassador receive you when you walk in.
 */
const AMBIENT_GREETINGS: Record<
  AmbassadorPersonality,
  Record<StandingTierName, string>
> = {
  formal: {
    Hostile: "The aide refuses to look up from their ledger when you enter.",
    Cold: "An aide receives you, citing protocol you didn't ask about.",
    Neutral: "The ambassador greets you with measured precision.",
    Warm: "The ambassador rises and offers a courteous bow.",
    Allied: "The ambassador welcomes you with the warmth of long protocol.",
  },
  mercenary: {
    Hostile: "They turn their back. 'Nothing for you here.'",
    Cold: "They eye your purse. 'Make it worthwhile.'",
    Neutral: "They tilt an eyebrow. 'What do you want?'",
    Warm: "They smile, calculating. 'Always good to see a paying friend.'",
    Allied: "They clasp your hand. 'My favorite line item.'",
  },
  suspicious: {
    Hostile: "They squint at your envoy and motion for a body scan.",
    Cold: "They watch your hands while you speak.",
    Neutral: "They listen, weighing every word for hidden meaning.",
    Warm: "Their guard slackens — barely.",
    Allied: "They nod, almost trusting. 'You've earned a chair at this table.'",
  },
  warm: {
    Hostile: "They look stricken — disappointed in you, more than angry.",
    Cold: "They greet you with a smile that doesn't quite reach the eyes.",
    Neutral: "They greet you genuinely, asking after the journey.",
    Warm: "They embrace your envoy at the door.",
    Allied: "They beam — 'It's been too long, my friend.'",
  },
};

export function getAmbientGreeting(
  personality: AmbassadorPersonality,
  tier: StandingTierName,
): string {
  return AMBIENT_GREETINGS[personality][tier];
}

export type TierShiftDirection = "up" | "down";

export interface TierShift {
  readonly id: string;
  readonly direction: TierShiftDirection;
  readonly from: StandingTierName;
  readonly to: StandingTierName;
}

const TIER_ORDER: readonly StandingTierName[] = [
  "Hostile",
  "Cold",
  "Neutral",
  "Warm",
  "Allied",
];

/**
 * Compares two snapshots of (id → tier) maps and returns the set of ids
 * whose tier name changed. The scene snapshots tiers between renders and
 * uses this to highlight changed rows.
 *
 * Targets present only in `prev` (target removed) or only in `current`
 * (target added) are skipped — they're not "shifts" in the conventional
 * sense. If we ever need to surface those, add separate predicates.
 */
export function detectTierShifts(
  prev: Record<string, StandingTierName>,
  current: Record<string, StandingTierName>,
): readonly TierShift[] {
  const out: TierShift[] = [];
  for (const [id, tier] of Object.entries(current)) {
    const before = prev[id];
    if (before === undefined || before === tier) continue;
    const beforeIdx = TIER_ORDER.indexOf(before);
    const afterIdx = TIER_ORDER.indexOf(tier);
    out.push({
      id,
      from: before,
      to: tier,
      direction: afterIdx > beforeIdx ? "up" : "down",
    });
  }
  return out;
}

/**
 * Builds a snapshot of (target id → current tier) for both empires and
 * rivals. Used by the scene to record state-at-render-time so the next
 * render can diff against it.
 */
export function snapshotTiers(
  state: GameState,
): Record<string, StandingTierName> {
  const out: Record<string, StandingTierName> = {};
  const empireRep = state.empireReputation ?? {};
  for (const id of Object.keys(empireRep)) {
    out[id] = getStandingTier(empireRep[id] ?? 50);
  }
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  for (const id of Object.keys(d.rivalStanding)) {
    out[id] = getStandingTier(d.rivalStanding[id] ?? 50);
  }
  return out;
}

/**
 * Short prose summary of what a single-category action will do, used in the
 * confirm panel. Lobby/non-compete actions go through their own pickers and
 * never reach this helper, so we don't enumerate them here.
 *
 * Returns `null` for kinds that aren't single-category — callers should fall
 * back to the action label.
 */
export function describeActionEffect(
  action: HubActionDescriptor,
): string | null {
  switch (action.kind) {
    case "giftEmpire":
      return "Sends a one-time gift to improve standing with this empire.";
    case "giftRival":
      return "Sends a peace offering to improve standing with this rival.";
    case "surveil": {
      const lens = action.surveilLens;
      if (lens === "cash") return "Reveals this rival's current cash reserves.";
      if (lens === "topContractByValue")
        return "Reveals this rival's most valuable active contract.";
      if (lens === "topEmpireStanding")
        return "Reveals which empire most favors this rival.";
      return "Gathers intelligence on this rival.";
    }
    case "sabotage":
      return "Disrupts a rival operation. High risk if detected.";
    default:
      return null;
  }
}

export function buildQueuedAction(
  action: HubActionDescriptor,
  targetId: string,
  turn: number,
  subjects: { subjectId?: string; subjectIdSecondary?: string } = {},
): QueuedDiplomacyAction {
  return {
    id: `${action.id}-${turn}`,
    kind: action.kind,
    targetId,
    cashCost: action.cashCost,
    ...(action.surveilLens ? { surveilLens: action.surveilLens } : {}),
    ...(subjects.subjectId ? { subjectId: subjects.subjectId } : {}),
    ...(subjects.subjectIdSecondary
      ? { subjectIdSecondary: subjects.subjectIdSecondary }
      : {}),
  };
}
