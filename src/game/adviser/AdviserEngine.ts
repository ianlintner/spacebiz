import type {
  AdviserState,
  AdviserMessage,
  AdviserMood,
  GameState,
  TurnResult,
  TutorialTrigger,
  EventCategory,
} from "../../data/types.ts";
import {
  GRADE_COMMENTARY,
  EVENT_REACTIONS,
  CONTEXTUAL_TIPS,
  WARNING_MESSAGES,
  STREAK_MESSAGES,
  buildRevealTexts,
} from "./AdviserMessages.ts";
import { TUTORIAL_STEPS } from "./TutorialDefinitions.ts";

// ── Init ───────────────────────────────────────────────────

export function initAdviserState(): AdviserState {
  return {
    tutorialStepIndex: 0,
    tutorialComplete: false,
    tutorialSkipped: false,
    pendingMessages: [],
    shownMessageIds: [],
    secretRevealed: false,
    statsAdviserSaved: 0,
    statsAdviserHindered: 0,
  };
}

// ── Helpers ────────────────────────────────────────────────

function makeMessage(
  template: {
    id: string;
    text: string;
    mood: AdviserMood;
    priority: 1 | 2 | 3;
    context: AdviserMessage["context"];
  },
  turn: number,
): AdviserMessage {
  return { ...template, turnGenerated: turn };
}

function getTurnGrade(netProfit: number, revenue: number): string {
  const margin = revenue > 0 ? netProfit / revenue : netProfit >= 0 ? 1 : -1;
  if (margin >= 0.4) return "S";
  if (margin >= 0.2) return "A";
  if (margin >= 0.05) return "B";
  if (margin >= 0) return "C";
  if (margin >= -0.15) return "D";
  return "F";
}

function pickVariant<T>(items: T[], turn: number): T {
  return items[turn % items.length];
}

// ── Turn message generation ────────────────────────────────

export function generateTurnMessages(
  state: GameState,
  lastTurn: TurnResult,
): AdviserMessage[] {
  const messages: AdviserMessage[] = [];
  const shown = new Set(state.adviser.shownMessageIds);
  const turn = state.turn;

  // 1. Grade commentary (always)
  const grade = getTurnGrade(lastTurn.netProfit, lastTurn.revenue);
  const gradeOptions = GRADE_COMMENTARY[grade] ?? GRADE_COMMENTARY["C"];
  const gradeMsg = pickVariant(gradeOptions, turn);
  messages.push(makeMessage(gradeMsg, turn));

  // 2. Event reactions (one per event category this turn)
  const categoriesSeen = new Set<string>();
  for (const evt of state.activeEvents) {
    if (categoriesSeen.has(evt.category)) continue;
    categoriesSeen.add(evt.category);
    const reactions = EVENT_REACTIONS[evt.category];
    if (reactions) {
      const reaction = pickVariant(reactions, turn + categoriesSeen.size);
      messages.push(makeMessage(reaction, turn));
    }
  }

  // 3. Streak messages
  const streak = state.storyteller.consecutiveProfitTurns;
  if (streak >= 8) {
    const s = STREAK_MESSAGES.find((m) => m.id === "streak_8")!;
    if (!shown.has(s.id)) messages.push(makeMessage(s, turn));
  } else if (streak >= 5) {
    const s = STREAK_MESSAGES.find((m) => m.id === "streak_5")!;
    if (!shown.has(s.id)) messages.push(makeMessage(s, turn));
  } else if (streak >= 3) {
    const s = STREAK_MESSAGES.find((m) => m.id === "streak_3")!;
    if (!shown.has(s.id)) messages.push(makeMessage(s, turn));
  }

  // 4. Warnings (contextual, dedup by id)
  if (state.storyteller.turnsInDebt >= 2) {
    const w = WARNING_MESSAGES.find((m) => m.id === "warn_debt")!;
    messages.push(makeMessage(w, turn));
  }
  if (state.activeRoutes.length === 0) {
    const w = WARNING_MESSAGES.find((m) => m.id === "warn_no_routes")!;
    messages.push(makeMessage(w, turn));
  }
  if (state.fleet.length === 0) {
    const w = WARNING_MESSAGES.find((m) => m.id === "warn_no_ships")!;
    messages.push(makeMessage(w, turn));
  }
  if (state.activeRoutes.length === 1) {
    const w = WARNING_MESSAGES.find((m) => m.id === "warn_single_route")!;
    if (!shown.has(w.id)) messages.push(makeMessage(w, turn));
  }
  const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
  if (unassigned.length > 0 && state.activeRoutes.length > 0) {
    const w = WARNING_MESSAGES.find((m) => m.id === "warn_unassigned")!;
    if (!shown.has(w.id)) messages.push(makeMessage(w, turn));
  }
  const avgCondition =
    state.fleet.length > 0
      ? state.fleet.reduce((sum, s) => sum + s.condition, 0) /
        state.fleet.length
      : 100;
  if (avgCondition < 50 && state.fleet.length > 0) {
    const w = WARNING_MESSAGES.find((m) => m.id === "warn_low_condition")!;
    if (!shown.has(w.id)) messages.push(makeMessage(w, turn));
  }

  // 5. One contextual tip per turn (cycle & dedup)
  const unseenTips = CONTEXTUAL_TIPS.filter((t) => !shown.has(t.id));
  if (unseenTips.length > 0) {
    const tip = pickVariant(unseenTips, turn);
    messages.push(makeMessage(tip, turn));
  }

  return messages;
}

// ── Tutorial advancement ───────────────────────────────────

export function checkTutorialAdvancement(
  adviser: AdviserState,
  trigger: TutorialTrigger,
  turn: number,
): AdviserState {
  if (adviser.tutorialComplete || adviser.tutorialSkipped) return adviser;

  const currentStep = TUTORIAL_STEPS[adviser.tutorialStepIndex];
  if (!currentStep) return adviser;

  if (currentStep.trigger !== trigger) return adviser;

  const msg = makeMessage(
    {
      id: currentStep.id,
      text: currentStep.text,
      mood: currentStep.mood,
      priority: 1,
      context: "tutorial",
    },
    turn,
  );

  const nextIndex = adviser.tutorialStepIndex + 1;
  const isComplete = nextIndex >= TUTORIAL_STEPS.length;

  return {
    ...adviser,
    tutorialStepIndex: nextIndex,
    tutorialComplete: isComplete,
    pendingMessages: [...adviser.pendingMessages, msg],
  };
}

// ── Reveal messages ────────────────────────────────────────

export function buildRevealMessages(state: GameState): AdviserMessage[] {
  const templates = buildRevealTexts(
    state.turn - 1,
    state.adviser.statsAdviserSaved,
    state.adviser.statsAdviserHindered,
  );
  return templates.map((t) => makeMessage(t, state.turn));
}

// ── Consume messages ───────────────────────────────────────

export function consumeMessages(
  adviser: AdviserState,
  count?: number,
): { consumed: AdviserMessage[]; adviser: AdviserState } {
  const n = count ?? adviser.pendingMessages.length;
  const consumed = adviser.pendingMessages.slice(0, n);
  const remaining = adviser.pendingMessages.slice(n);
  const newShownIds = [
    ...adviser.shownMessageIds,
    ...consumed.map((m) => m.id),
  ];

  return {
    consumed,
    adviser: {
      ...adviser,
      pendingMessages: remaining,
      shownMessageIds: newShownIds,
    },
  };
}

// ── Mood helper for EventCategory ──────────────────────────

export function moodForEventCategory(category: EventCategory): AdviserMood {
  switch (category) {
    case "hazard":
      return "alert";
    case "opportunity":
      return "success";
    case "market":
      return "analyzing";
    case "flavor":
    default:
      return "standby";
  }
}
