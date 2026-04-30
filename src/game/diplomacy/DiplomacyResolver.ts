import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type {
  DiplomacyState,
  GameState,
  QueuedDiplomacyAction,
  StandingTag,
} from "../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../data/types.ts";
import { addTag, hasTagOfKind, replaceTag } from "./StandingTags.ts";
import { setCooldown, cooldownKey } from "./Cooldowns.ts";
import { isTierTransition } from "./StandingTiers.ts";

export interface DigestEntry {
  readonly text: string;
}

export interface ModalEntry {
  readonly speakerKind:
    | "empireAmbassador"
    | "empireRuler"
    | "rivalLiaison"
    | "rivalCEO";
  readonly targetId: string;
  readonly headline: string;
  readonly flavor: string;
}

export interface ResolutionOutcome {
  readonly nextState: GameState;
  readonly modalEntries: readonly ModalEntry[];
  readonly digestEntries: readonly DigestEntry[];
  readonly success: boolean;
}

const LOBBY_BASE_SUCCESS = 0.6;
const LOBBY_OWE_FAVOR_BONUS = 0.15;
const LOBBY_DELTA = 10;
const LOBBY_COOLDOWN = 4;

const GIFT_EMPIRE_BASE_DELTA = 8;
const GIFT_RIVAL_BASE_DELTA = 6;
const GIFT_EMPIRE_COOLDOWN = 3;
const GIFT_RIVAL_COOLDOWN = 3;
const GIFT_RECENTLY_GIFTED_TTL = 3;
const GIFT_OWE_FAVOR_TTL = 5;
const GIFT_OWE_FAVOR_CHANCE = 0.3;
const GIFT_EMPIRE_BASE_SUCCESS = 0.7;
const GIFT_RIVAL_SUCCESS = 0.8;
const GIFT_NO_RECENT_BONUS = 0.1;
const DIMINISHING_RETURNS_THRESHOLD = 70;

function dip(state: GameState): DiplomacyState {
  return state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function applyStandingDelta(current: number, delta: number): number {
  if (delta <= 0 || current < DIMINISHING_RETURNS_THRESHOLD) {
    return clamp(current + delta);
  }
  const scale = (100 - current) / 30;
  return clamp(current + Math.floor(delta * scale));
}

function anyEmpireRecentlyGifted(state: GameState): boolean {
  return Object.values(dip(state).empireTags).some((tags) =>
    hasTagOfKind(tags, "RecentlyGifted"),
  );
}

function anyRivalRecentlyGifted(state: GameState): boolean {
  return Object.values(dip(state).rivalTags).some((tags) =>
    hasTagOfKind(tags, "RecentlyGifted"),
  );
}

export function resolveGiftEmpire(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const { targetId } = action;
  const recentlyGifted = anyEmpireRecentlyGifted(state);
  const dampener = recentlyGifted ? 0.5 : 1.0;
  const successChance =
    GIFT_EMPIRE_BASE_SUCCESS + (recentlyGifted ? 0 : GIFT_NO_RECENT_BONUS);
  const success = rng.chance(successChance);

  const beforeStanding = state.empireReputation?.[targetId] ?? 50;
  let nextStanding = beforeStanding;
  let cashAfter = state.cash - action.cashCost;
  const tagsBefore = dip(state).empireTags[targetId] ?? [];
  let tagsAfter: readonly StandingTag[] = tagsBefore;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    const delta = Math.floor(GIFT_EMPIRE_BASE_DELTA * dampener);
    nextStanding = applyStandingDelta(beforeStanding, delta);
    tagsAfter = replaceTag(tagsAfter, {
      kind: "RecentlyGifted",
      expiresOnTurn: state.turn + GIFT_RECENTLY_GIFTED_TTL,
    });
    if (rng.chance(GIFT_OWE_FAVOR_CHANCE)) {
      tagsAfter = replaceTag(tagsAfter, {
        kind: "OweFavor",
        expiresOnTurn: state.turn + GIFT_OWE_FAVOR_TTL,
      });
    }
    digest.push({
      text: `Gift to ${targetId} accepted: +${delta} standing.`,
    });
    if (isTierTransition(beforeStanding, nextStanding)) {
      modal.push({
        speakerKind: "empireRuler",
        targetId,
        headline: "Tier shift",
        flavor: "Standing has shifted.",
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    modal.push({
      speakerKind: "empireAmbassador",
      targetId,
      headline: "Gift refused",
      flavor: "The ambassador returns your gift unopened.",
    });
  }

  const prevDip = dip(state);
  const nextCooldowns = setCooldown(
    prevDip.cooldowns,
    cooldownKey("giftEmpire", targetId),
    state.turn + GIFT_EMPIRE_COOLDOWN,
  );

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      empireReputation: {
        ...(state.empireReputation ?? {}),
        [targetId]: nextStanding,
      },
      diplomacy: {
        ...prevDip,
        empireTags: {
          ...prevDip.empireTags,
          [targetId]: tagsAfter,
        },
        cooldowns: nextCooldowns,
        actionsResolvedThisTurn: prevDip.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}

export function resolveGiftRival(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const { targetId } = action;
  const dampener = anyRivalRecentlyGifted(state) ? 0.5 : 1.0;
  const success = rng.chance(GIFT_RIVAL_SUCCESS);

  const prevDip = dip(state);
  const before = prevDip.rivalStanding[targetId] ?? 50;
  const tagsBefore = prevDip.rivalTags[targetId] ?? [];
  let next = before;
  let tagsAfter: readonly StandingTag[] = tagsBefore;
  let cashAfter = state.cash - action.cashCost;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    const delta = Math.floor(GIFT_RIVAL_BASE_DELTA * dampener);
    next = applyStandingDelta(before, delta);
    tagsAfter = replaceTag(tagsAfter, {
      kind: "RecentlyGifted",
      expiresOnTurn: state.turn + GIFT_RECENTLY_GIFTED_TTL,
    });
    // Wave-1 asymmetry: rival gifts do not produce OweFavor tags. The favor
    // mechanic is a diplomatic-tier signal that reads as "an empire owes
    // you political capital" — corporate rivals model that differently
    // (non-compete, IOU contracts) which is wave-2.
    digest.push({ text: `Gift to ${targetId} accepted: +${delta} standing.` });
    if (isTierTransition(before, next)) {
      modal.push({
        speakerKind: "rivalCEO",
        targetId,
        headline: "Tier shift",
        flavor: "Relationship temperature has shifted.",
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    modal.push({
      speakerKind: "rivalLiaison",
      targetId,
      headline: "Gift refused",
      flavor: "Their corporate liaison politely declines.",
    });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...prevDip,
        rivalStanding: {
          ...prevDip.rivalStanding,
          [targetId]: next,
        },
        rivalTags: {
          ...prevDip.rivalTags,
          [targetId]: tagsAfter,
        },
        cooldowns: setCooldown(
          prevDip.cooldowns,
          cooldownKey("giftRival", targetId),
          state.turn + GIFT_RIVAL_COOLDOWN,
        ),
        actionsResolvedThisTurn: prevDip.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}

export function resolveLobby(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const empireId = action.targetId;
  const rivalId = action.subjectId;
  if (!rivalId) {
    throw new Error("resolveLobby requires subjectId (target rival)");
  }
  const direction = action.kind === "lobbyFor" ? +1 : -1;
  const d = dip(state);
  const empireTags = d.empireTags[empireId] ?? [];
  const oweBonus = hasTagOfKind(empireTags, "OweFavor")
    ? LOBBY_OWE_FAVOR_BONUS
    : 0;
  const success = rng.chance(LOBBY_BASE_SUCCESS + oweBonus);

  const empireMap = d.crossEmpireRivalStanding[empireId] ?? {};
  const before = empireMap[rivalId] ?? 50;
  let next = before;
  let cashAfter = state.cash - action.cashCost;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    next = clamp(before + direction * LOBBY_DELTA);
    digest.push({
      text: `${empireId} ${direction > 0 ? "warmer" : "cooler"} toward ${rivalId} (${before} → ${next}).`,
    });
    if (isTierTransition(before, next)) {
      modal.push({
        speakerKind: "empireAmbassador",
        targetId: empireId,
        headline: "Tier shift",
        flavor: `Their stance toward ${rivalId} has shifted.`,
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    digest.push({ text: `Lobbying ${empireId} on ${rivalId}: no effect.` });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...d,
        crossEmpireRivalStanding: {
          ...d.crossEmpireRivalStanding,
          [empireId]: { ...empireMap, [rivalId]: next },
        },
        cooldowns: setCooldown(
          d.cooldowns,
          cooldownKey(action.kind, empireId, rivalId),
          state.turn + LOBBY_COOLDOWN,
        ),
        actionsResolvedThisTurn: d.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}

const NON_COMPETE_TTL = 10;
const NON_COMPETE_COOLDOWN = 5;
const NON_COMPETE_MIN_STANDING = 20; // Cold tier or above

export function resolveNonCompete(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const rivalId = action.targetId;
  const empireA = action.subjectId;
  const empireB = action.subjectIdSecondary;
  if (!empireA || !empireB) {
    throw new Error(
      "resolveNonCompete requires subjectId and subjectIdSecondary (empire pair)",
    );
  }

  const d = dip(state);
  const standing = d.rivalStanding[rivalId] ?? 50;
  const accept = standing >= NON_COMPETE_MIN_STANDING && rng.chance(0.7);

  const tagsBefore = d.rivalTags[rivalId] ?? [];
  const tagsAfter = accept
    ? addTag(tagsBefore, {
        kind: "NonCompete",
        protectedEmpireIds: [empireA, empireB],
        expiresOnTurn: state.turn + NON_COMPETE_TTL,
      })
    : tagsBefore;

  const modal: ModalEntry[] = [
    {
      speakerKind: "rivalCEO",
      targetId: rivalId,
      headline: accept ? "Non-Compete signed" : "Non-Compete refused",
      flavor: accept
        ? `${empireA} and ${empireB} markets are now segregated.`
        : "Their CEO declines the proposal.",
    },
  ];

  return {
    nextState: {
      ...state,
      diplomacy: {
        ...d,
        rivalTags: { ...d.rivalTags, [rivalId]: tagsAfter },
        cooldowns: setCooldown(
          d.cooldowns,
          cooldownKey("proposeNonCompete", rivalId),
          state.turn + NON_COMPETE_COOLDOWN,
        ),
        actionsResolvedThisTurn: d.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: [],
    success: accept,
  };
}

const SURVEIL_BASE_SUCCESS = 0.65;
const SURVEIL_INTEL_TTL = 3;
const SURVEIL_SPY_TTL = 5;
const SURVEIL_COOLDOWN = 6;

function readSurveilValue(
  state: GameState,
  rivalId: string,
  lens: "cash" | "topContractByValue" | "topEmpireStanding",
): string {
  const rival = state.aiCompanies?.find((r) => r.id === rivalId);
  if (!rival) return "unknown";
  switch (lens) {
    case "cash":
      return String(rival.cash ?? 0);
    case "topContractByValue": {
      const routes = (rival.activeRoutes ?? []) as readonly {
        value?: number;
      }[];
      const top = routes.map((r) => r.value ?? 0).sort((a, b) => b - a)[0];
      return top !== undefined ? String(top) : "none";
    }
    case "topEmpireStanding": {
      const cross = dip(state).crossEmpireRivalStanding;
      let bestId = "none";
      let bestVal = -1;
      for (const [empireId, map] of Object.entries(cross)) {
        const v = map[rivalId];
        if (v !== undefined && v > bestVal) {
          bestVal = v;
          bestId = empireId;
        }
      }
      return bestId;
    }
  }
}

export function resolveSurveil(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const rivalId = action.targetId;
  const lens = action.surveilLens ?? "cash";
  const success = rng.chance(SURVEIL_BASE_SUCCESS);

  const d = dip(state);
  const tagsBefore = d.rivalTags[rivalId] ?? [];
  let tagsAfter = tagsBefore;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];
  const cashAfter = state.cash - action.cashCost;

  if (success) {
    const value = readSurveilValue(state, rivalId, lens);
    tagsAfter = addTag(tagsBefore, {
      kind: "LeakedIntel",
      lens,
      value,
      expiresOnTurn: state.turn + SURVEIL_INTEL_TTL,
    });
    digest.push({
      text: `Surveillance of ${rivalId}: leaked ${lens} = ${value} (${SURVEIL_INTEL_TTL} turns).`,
    });
  } else {
    tagsAfter = addTag(tagsBefore, {
      kind: "SuspectedSpy",
      suspectId: "player",
      expiresOnTurn: state.turn + SURVEIL_SPY_TTL,
    });
    modal.push({
      speakerKind: "rivalLiaison",
      targetId: rivalId,
      headline: "Surveillance exposed",
      flavor: "Their counter-intel team has flagged you.",
    });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...d,
        rivalTags: { ...d.rivalTags, [rivalId]: tagsAfter },
        cooldowns: setCooldown(
          d.cooldowns,
          cooldownKey("surveil", rivalId),
          state.turn + SURVEIL_COOLDOWN,
        ),
        actionsResolvedThisTurn: d.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}

const THROTTLE_BASE = 2;
const THROTTLE_HIGH = 3;
const REPUTATION_THROTTLE_THRESHOLD = 75;

export function resolveDiplomacyAction(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  switch (action.kind) {
    case "giftEmpire":
      return resolveGiftEmpire(state, action, rng);
    case "giftRival":
      return resolveGiftRival(state, action, rng);
    case "lobbyFor":
    case "lobbyAgainst":
      return resolveLobby(state, action, rng);
    case "proposeNonCompete":
      return resolveNonCompete(state, action, rng);
    case "surveil":
      return resolveSurveil(state, action, rng);
  }
}

export interface QueueProcessingResult {
  readonly nextState: GameState;
  readonly modalEntries: readonly ModalEntry[];
  readonly digestEntries: readonly DigestEntry[];
}

function buildDisplayNameMap(state: GameState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of state.galaxy?.empires ?? []) {
    if (e.id && e.name) out[e.id] = e.name;
  }
  for (const r of state.aiCompanies ?? []) {
    if (r.id && r.name) out[r.id] = r.name;
  }
  return out;
}

function substituteIds(text: string, names: Record<string, string>): string {
  let result = text;
  for (const [id, name] of Object.entries(names)) {
    // word-boundary so "vex" doesn't replace inside "vexHegemony"
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${safe}\\b`, "g"), name);
  }
  return result;
}

/**
 * Drains `state.diplomacy.queuedActions` and applies effects for up to the
 * per-turn cap (2 normally, 3 at reputation tier renowned+). Actions queued
 * beyond the cap surface as "deferred" digest lines.
 *
 * The cap is enforced here via `slice(0, cap)` — individual resolvers do
 * not enforce it, so callers MUST go through this dispatcher rather than
 * calling resolvers directly. Each resolver also increments
 * `actionsResolvedThisTurn`, but that counter is metadata only — it is
 * reset to 0 every turn by `tickDiplomacyState`.
 */
export function processQueuedDiplomacyActions(
  state: GameState,
  rng: SeededRNG,
): QueueProcessingResult {
  const cap =
    (state.reputation ?? 0) >= REPUTATION_THROTTLE_THRESHOLD
      ? THROTTLE_HIGH
      : THROTTLE_BASE;
  const queued = dip(state).queuedActions;
  const toResolve = queued.slice(0, cap);
  const deferred = queued.slice(cap);

  let cur: GameState = {
    ...state,
    diplomacy: { ...dip(state), queuedActions: [] },
  };
  const allModal: ModalEntry[] = [];
  const allDigest: DigestEntry[] = [];
  const names = buildDisplayNameMap(state);

  for (const action of toResolve) {
    const out = resolveDiplomacyAction(cur, action, rng);
    cur = out.nextState;
    allModal.push(
      ...out.modalEntries.map((m) => ({
        ...m,
        flavor: substituteIds(m.flavor, names),
        headline: substituteIds(m.headline, names),
      })),
    );
    allDigest.push(
      ...out.digestEntries.map((d) => ({ text: substituteIds(d.text, names) })),
    );
  }

  for (const action of deferred) {
    const target = names[action.targetId] ?? action.targetId;
    allDigest.push({
      text: `Diplomatic action ${action.kind} on ${target} deferred (turn cap reached).`,
    });
  }

  return { nextState: cur, modalEntries: allModal, digestEntries: allDigest };
}
