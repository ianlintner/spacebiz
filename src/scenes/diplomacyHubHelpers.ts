import type {
  AICompany,
  DiplomacyActionKind,
  Empire,
  GameState,
  QueuedDiplomacyAction,
  SurveilLens,
} from "../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../data/types.ts";
import { cooldownKey, isOnCooldown } from "../game/diplomacy/Cooldowns.ts";

export const HUB_THROTTLE_BASE = 2;
export const HUB_THROTTLE_HIGH = 3;
export const HUB_REPUTATION_THRESHOLD = 75;

const GIFT_EMPIRE_BASE = 5_000;
const GIFT_EMPIRE_PER_SYSTEM = 1_500;
const GIFT_EMPIRE_CAP = 20_000;
const GIFT_RIVAL_COST = 5_000;
const SURVEIL_COST = 15_000;

export interface HubActionDescriptor {
  readonly id: string;
  readonly kind: DiplomacyActionKind;
  readonly label: string;
  readonly cashCost: number;
  readonly surveilLens?: SurveilLens;
}

export interface HubActionState {
  readonly enabled: boolean;
  readonly reasonIfDisabled?: "cooldown" | "cap" | "cash";
  readonly cooldownTurnsRemaining?: number;
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
    },
    {
      id: `surveil-cash-${rival.id}`,
      kind: "surveil",
      label: "Surveil: Cash",
      cashCost: SURVEIL_COST,
      surveilLens: "cash",
    },
    {
      id: `surveil-contract-${rival.id}`,
      kind: "surveil",
      label: "Surveil: Top Contract",
      cashCost: SURVEIL_COST,
      surveilLens: "topContractByValue",
    },
    {
      id: `surveil-standing-${rival.id}`,
      kind: "surveil",
      label: "Surveil: Best Ally",
      cashCost: SURVEIL_COST,
      surveilLens: "topEmpireStanding",
    },
  ];
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

  return { enabled: true };
}

export function buildQueuedAction(
  action: HubActionDescriptor,
  targetId: string,
  turn: number,
): QueuedDiplomacyAction {
  return {
    id: `${action.id}-${turn}`,
    kind: action.kind,
    targetId,
    cashCost: action.cashCost,
    ...(action.surveilLens ? { surveilLens: action.surveilLens } : {}),
  };
}
