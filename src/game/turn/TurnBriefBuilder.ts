import type {
  GameState,
  TurnBriefCard,
  TurnBriefUrgency,
} from "../../data/types.ts";

// ── Urgency ordering ────────────────────────────────────────────
const URGENCY_ORDER: TurnBriefUrgency[] = ["critical", "high", "medium", "low"];
const MAX_BRIEF_CARDS = 4;

function urgencyRank(u: TurnBriefUrgency): number {
  return URGENCY_ORDER.indexOf(u);
}

// ── Builder ─────────────────────────────────────────────────────

/**
 * Analyzes the current GameState and returns up to 4 TurnBriefCards sorted
 * by urgency (critical → high → medium → low).
 */
export function buildTurnBrief(state: GameState): TurnBriefCard[] {
  const cards: TurnBriefCard[] = [];
  let idCounter = 0;
  const nextId = (): string => `brief-${++idCounter}`;

  // 1. (was: ship-condition warnings — ships removed in capacity model)

  // 2. Active contracts expiring in 1 or 2 turns
  for (const contract of state.contracts) {
    if (contract.status !== "active") continue;
    if (contract.turnsRemaining === 1) {
      cards.push({
        id: nextId(),
        category: "contract",
        urgency: "critical",
        title: "Contract Expiring",
        summary: "Contract expires next turn",
        action: "resolve",
        linkedId: contract.id,
      });
    } else if (contract.turnsRemaining === 2) {
      cards.push({
        id: nextId(),
        category: "contract",
        urgency: "high",
        title: "Contract Expiring",
        summary: "Contract expires in 2 turns",
        action: "resolve",
        linkedId: contract.id,
      });
    }
  }

  // 3. No active routes at all
  if (state.activeRoutes.length === 0) {
    cards.push({
      id: nextId(),
      category: "warning",
      urgency: "critical",
      title: "No Active Routes",
      summary: "You have no routes earning income",
      action: "resolve",
    });
  }

  // 4. (was: idle-ship warning — ships removed in capacity model)

  // 5. Route market opportunities expiring soon
  for (const entry of state.routeMarket) {
    if (entry.expiresOnTurn <= state.turn + 1) {
      cards.push({
        id: nextId(),
        category: "opportunity",
        urgency: "high",
        title: "Route Opportunity Expiring",
        summary: "A trade route opportunity expires soon",
        action: "resolve",
        linkedId: entry.id,
      });
    }
  }

  // 6. AP exhausted with pending choice events
  if (
    state.actionPoints.current === 0 &&
    state.pendingChoiceEvents.length > 0
  ) {
    cards.push({
      id: nextId(),
      category: "choice_event",
      urgency: "medium",
      title: "Pending Decisions",
      summary: "You have unanswered events",
      action: "resolve",
    });
  }

  // 7. Active event chains
  for (const chain of state.activeEventChains) {
    cards.push({
      id: nextId(),
      category: "warning",
      urgency: "high",
      title: "Event Chain Active",
      summary: `${chain.chainId} crisis in progress`,
      action: "resolve",
    });
  }

  // 8. No research queued
  if (!state.tech?.currentResearchId) {
    cards.push({
      id: nextId(),
      category: "research",
      urgency: "low",
      title: "No Research Queued",
      summary: "Queue a technology to earn RP bonuses",
      action: "resolve",
    });
  }

  // Sort by urgency, then cap at MAX_BRIEF_CARDS
  cards.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  return cards.slice(0, MAX_BRIEF_CARDS);
}
