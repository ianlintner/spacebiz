import type {
  Ship,
  StorytellerState,
  GameState,
  ChoiceEvent,
  DilemmaTemplate,
  ChoiceOption,
} from "../../data/types.ts";
import { STARTING_CASH } from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { DILEMMA_TEMPLATES } from "./DilemmaDefinitions.ts";
import { computeOptionSuccess } from "./SuccessFormula.ts";

/**
 * Calculates a player health score (0–100) based on financial indicators.
 *
 * Factors:
 *   - cashRatio: current cash relative to starting cash (clamped 0–2, mapped to 0–40)
 *   - fleetScore: number of ships (clamped 0–10, mapped to 0–20)
 *   - profitScore: based on lastTurnProfit relative to maintenance costs (mapped to 0–40)
 */
function calculateHealthScore(
  cash: number,
  fleet: Ship[],
  lastTurnProfit: number,
): number {
  const cashRatio = Math.max(0, Math.min(cash / STARTING_CASH, 2));
  const cashScore = (cashRatio / 2) * 40;

  const fleetSize = Math.max(0, Math.min(fleet.length, 10));
  const fleetScore = (fleetSize / 10) * 20;

  const profitTarget = STARTING_CASH * 0.1;
  const profitRatio = Math.max(-1, Math.min(lastTurnProfit / profitTarget, 2));
  const profitScore = ((profitRatio + 1) / 3) * 40;

  return Math.round(
    Math.max(0, Math.min(100, cashScore + fleetScore + profitScore)),
  );
}

/** Decay factor applied to `recentIntensity` each turn. */
const INTENSITY_DECAY = 0.6;

/**
 * Update the storyteller state based on current game indicators.
 *
 * Also ticks pacing fields: `turnsSinceLastDilemma` increments, and
 * `recentIntensity` decays. Use `recordDilemmaFired` to reset
 * `turnsSinceLastDilemma` and bump `recentIntensity` when a dilemma actually
 * fires this turn.
 *
 * headwindBias is positive when the player is doing well (sends harder events)
 * and negative when the player is struggling (sends helpful events).
 */
export function updateStorytellerState(
  state: StorytellerState,
  cash: number,
  fleet: Ship[],
  lastTurnProfit: number,
): StorytellerState {
  const playerHealthScore = calculateHealthScore(cash, fleet, lastTurnProfit);

  const turnsInDebt = cash < 0 ? state.turnsInDebt + 1 : 0;
  const consecutiveProfitTurns =
    lastTurnProfit > 0 ? state.consecutiveProfitTurns + 1 : 0;

  let headwindBias = 0;
  if (playerHealthScore > 60) {
    headwindBias = (playerHealthScore - 60) / 40;
  } else if (playerHealthScore < 40) {
    headwindBias = (playerHealthScore - 40) / 40;
  }

  return {
    ...state,
    playerHealthScore,
    headwindBias,
    turnsInDebt,
    consecutiveProfitTurns,
    turnsSinceLastDecision: state.turnsSinceLastDecision + 1,
    turnsSinceLastDilemma: (state.turnsSinceLastDilemma ?? 0) + 1,
    recentIntensity: (state.recentIntensity ?? 0) * INTENSITY_DECAY,
  };
}

/**
 * Reset dilemma cooldown and add intensity. Call after a dilemma fires.
 */
export function recordDilemmaFired(
  state: StorytellerState,
  intensityAdded: number,
): StorytellerState {
  return {
    ...state,
    turnsSinceLastDilemma: 0,
    recentIntensity: (state.recentIntensity ?? 0) + intensityAdded,
  };
}

// ---------------------------------------------------------------------------
// Dilemma pacing & selection
// ---------------------------------------------------------------------------

/** Hard floor: never fire two dilemmas closer than this many turns apart. */
export const DILEMMA_MIN_COOLDOWN = 2;
/** Soft cap: when `recentIntensity` is above this, suppress dilemma firing entirely. */
export const INTENSITY_SUPPRESSION_THRESHOLD = 4;

/**
 * Decide whether the storyteller fires a dilemma this turn, and if so, return
 * a fully-formed ChoiceEvent ready to push onto pendingChoiceEvents.
 *
 * Returns null when:
 *   - within cooldown window
 *   - intensity is too high (no piling on)
 *   - the storyteller's per-turn random roll fails
 *   - no eligible templates
 *
 * The decision is RNG-driven and deterministic for a given seed.
 */
export function selectDilemma(
  rng: SeededRNG,
  state: GameState,
): ChoiceEvent | null {
  const teller = state.storyteller;
  const turnsSinceLastDilemma = teller.turnsSinceLastDilemma ?? 0;
  const recentIntensity = teller.recentIntensity ?? 0;

  // Hard cooldown — never spam.
  if (turnsSinceLastDilemma < DILEMMA_MIN_COOLDOWN) return null;

  // Intensity suppression — let things settle after big swings.
  if (recentIntensity >= INTENSITY_SUPPRESSION_THRESHOLD) return null;

  // Per-turn fire chance: base 25%, scales up the longer the player has gone
  // without a dilemma (1+ extra % per turn over cooldown), modulated by the
  // pacing mode. Trailing players (negative headwindBias) see more firings;
  // dominant players see fewer (their challenge already comes from EventEngine).
  const turnsOverCooldown = turnsSinceLastDilemma - DILEMMA_MIN_COOLDOWN;
  let baseChance = 0.25 + Math.min(0.4, turnsOverCooldown * 0.05);

  if (teller.headwindBias < 0) {
    // Player struggling — push more help.
    baseChance += Math.abs(teller.headwindBias) * 0.2;
  } else if (teller.headwindBias > 0.4) {
    // Player dominating — slow the cadence so the headwind events do the work.
    baseChance *= 0.7;
  }

  switch (teller.mode) {
    case "breather":
      baseChance *= 0.7;
      break;
    case "variance":
      // High variance: occasionally spike up, occasionally drop to nothing.
      baseChance *= rng.nextFloat(0.3, 1.6);
      break;
    case "steady":
    default:
      break;
  }

  if (rng.nextFloat(0, 1) > baseChance) return null;

  // Pick a template by weighted selection biased on headwind/tailwind pull.
  const eligible = DILEMMA_TEMPLATES.filter((t) => isDilemmaEligible(t, state));
  if (eligible.length === 0) return null;

  const weights = eligible.map((t) => {
    let w = t.weight;
    if (teller.headwindBias > 0) w += teller.headwindBias * t.headwindWeight;
    else if (teller.headwindBias < 0)
      w += Math.abs(teller.headwindBias) * t.tailwindWeight;
    return Math.max(0.01, w);
  });

  const template = eligible[weightedPick(rng, weights)];

  return materializeDilemma(template, state, rng);
}

function isDilemmaEligible(template: DilemmaTemplate, state: GameState): boolean {
  switch (template.eligibility) {
    case "midGame":
      return state.turn >= Math.floor(state.maxTurns * 0.25);
    case "lateGame":
      return state.turn >= Math.floor(state.maxTurns * 0.5);
    case "anyTime":
    case undefined:
      return true;
  }
}

/**
 * Convert a DilemmaTemplate + current state into a concrete ChoiceEvent.
 * Substitutes prompt tokens, freezes per-option success%, attaches metadata.
 */
function materializeDilemma(
  template: DilemmaTemplate,
  state: GameState,
  rng: SeededRNG,
): ChoiceEvent {
  const optionSuccess: Record<string, number> = {};
  const options: ChoiceOption[] = template.options.map((o) => {
    const pct = computeOptionSuccess(state, o);
    optionSuccess[o.id] = pct;
    return o;
  });

  return {
    id: `dilemma_${template.id}_${state.turn}_${rng.nextInt(1000, 9999)}`,
    eventId: template.id,
    prompt: substituteTokens(template.prompt, state, rng),
    options,
    turnCreated: state.turn,
    optionSuccess,
    dilemmaId: template.id,
    category: template.category,
    imageKey: template.imageKey,
  };
}

/**
 * Substitute {empire} / {rival} / {port} tokens in a prompt with concrete names
 * from current state. Old World–style subject binding so one card produces
 * dozens of phrasings.
 */
function substituteTokens(
  prompt: string,
  state: GameState,
  rng: SeededRNG,
): string {
  let out = prompt;
  if (out.includes("{empire}")) {
    const empires = state.galaxy.empires;
    const name = empires.length > 0 ? rng.pick(empires).name : "the council";
    out = out.replace(/\{empire\}/g, name);
  }
  if (out.includes("{rival}")) {
    const live = state.aiCompanies.filter((c) => !c.bankrupt);
    const name = live.length > 0 ? rng.pick(live).name : "a rival";
    out = out.replace(/\{rival\}/g, name);
  }
  if (out.includes("{port}")) {
    const planets = state.galaxy.planets;
    const name = planets.length > 0 ? rng.pick(planets).name : "the spaceport";
    out = out.replace(/\{port\}/g, name);
  }
  return out;
}

function weightedPick(rng: SeededRNG, weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  let roll = rng.nextFloat(0, total);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}
