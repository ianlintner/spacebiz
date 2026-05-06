import type { GameState, RivalMessage } from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { hasTagOfKind } from "../diplomacy/StandingTags.ts";

const COOLDOWN_KEY = (rivalId: string) => `rmsg-${rivalId}`;

/** Max rival messages surfaced per turn so the player isn't flooded. */
const MAX_PER_TURN = 2;

/** Priority order — higher index = lower priority when trimming to MAX_PER_TURN. */
const KIND_PRIORITY: RivalMessage["kind"][] = [
  "espionageCaught",
  "warning",
  "proposal",
  "taunt",
  "congratulate",
  "flavor",
];

interface Candidate {
  message: RivalMessage;
  cooldownTurns: number;
}

function isOnCooldown(
  cooldowns: Record<string, number>,
  rivalId: string,
  currentTurn: number,
): boolean {
  const expiry = cooldowns[COOLDOWN_KEY(rivalId)] ?? 0;
  return currentTurn < expiry;
}

export function generateRivalMessages(
  state: GameState,
  rng: SeededRNG,
): { messages: RivalMessage[]; cooldownUpdates: Record<string, number> } {
  const { aiCompanies, diplomacy, storyteller } = state;
  if (!aiCompanies?.length || !diplomacy) {
    return { messages: [], cooldownUpdates: {} };
  }

  const currentTurn = state.turn;
  const cooldowns = diplomacy.cooldowns ?? {};
  const playerCash = state.cash;
  const playerRoutes = state.activeRoutes.length;
  const playerSystems = new Set(
    state.activeRoutes.flatMap((r) => {
      const origin = state.galaxy.planets.find(
        (p) => p.id === r.originPlanetId,
      );
      const dest = state.galaxy.planets.find(
        (p) => p.id === r.destinationPlanetId,
      );
      const systems: string[] = [];
      if (origin) {
        const sys = state.galaxy.systems.find((s) => s.id === origin.systemId);
        if (sys?.empireId) systems.push(sys.empireId);
      }
      if (dest) {
        const sys = state.galaxy.systems.find((s) => s.id === dest.systemId);
        if (sys?.empireId) systems.push(sys.empireId);
      }
      return systems;
    }),
  );

  const candidates: Candidate[] = [];

  for (const rival of aiCompanies) {
    if (rival.bankrupt) continue;
    if (isOnCooldown(cooldowns, rival.id, currentTurn)) continue;

    const rivalTags = diplomacy.rivalTags[rival.id] ?? [];
    const rivalStanding = diplomacy.rivalStanding[rival.id] ?? 50;

    // ── espionageCaught ──────────────────────────────────────────────────
    const wasSurveilled = hasTagOfKind(rivalTags, "SuspectedSpy");
    const wasSabotaged = hasTagOfKind(rivalTags, "Sabotaged");
    if ((wasSurveilled || wasSabotaged) && rng.next() < 0.75) {
      candidates.push({
        message: { rivalId: rival.id, kind: "espionageCaught" },
        cooldownTurns: 3,
      });
      continue; // one message per rival per turn
    }

    const hasNonCompete = hasTagOfKind(rivalTags, "NonCompete");

    // ── warning — rival encroachment ─────────────────────────────────────
    if (!hasNonCompete && rival.personality === "aggressiveExpander") {
      const rivalEmpireIds = new Set(
        rival.activeRoutes.flatMap((r) => {
          const origin = state.galaxy.planets.find(
            (p) => p.id === r.originPlanetId,
          );
          const dest = state.galaxy.planets.find(
            (p) => p.id === r.destinationPlanetId,
          );
          const empires: string[] = [];
          [origin, dest].forEach((pl) => {
            if (!pl) return;
            const sys = state.galaxy.systems.find((s) => s.id === pl.systemId);
            if (sys?.empireId) empires.push(sys.empireId);
          });
          return empires;
        }),
      );
      const overlap = [...playerSystems].some((e) => rivalEmpireIds.has(e));
      if (overlap && rival.activeRoutes.length >= 3 && rng.next() < 0.35) {
        candidates.push({
          message: { rivalId: rival.id, kind: "warning" },
          cooldownTurns: 5,
        });
        continue;
      }
    }

    // ── proposal — steady haulers who share lanes ────────────────────────
    if (
      rival.personality === "steadyHauler" &&
      currentTurn >= 6 &&
      rivalStanding > 30 &&
      rng.next() < 0.18
    ) {
      candidates.push({
        message: {
          rivalId: rival.id,
          kind: "proposal",
          proposalType: "nonCompete",
        },
        cooldownTurns: 10,
      });
      continue;
    }

    // ── taunt — rival far ahead ──────────────────────────────────────────
    if (
      !hasNonCompete &&
      rival.cash > playerCash * 1.75 &&
      rival.activeRoutes.length >= playerRoutes &&
      rng.next() < 0.22
    ) {
      candidates.push({
        message: { rivalId: rival.id, kind: "taunt" },
        cooldownTurns: 6,
      });
      continue;
    }

    // ── congratulate — player on a winning streak, rival acknowledges ────
    if (
      storyteller.consecutiveProfitTurns >= 5 &&
      rivalStanding >= 60 &&
      rng.next() < 0.14
    ) {
      candidates.push({
        message: { rivalId: rival.id, kind: "congratulate" },
        cooldownTurns: 8,
      });
      continue;
    }

    // ── flavor — periodic character-building contact ─────────────────────
    if (rng.next() < 0.07) {
      candidates.push({
        message: { rivalId: rival.id, kind: "flavor" },
        cooldownTurns: 5,
      });
    }
  }

  // Sort by priority and cap at MAX_PER_TURN
  candidates.sort(
    (a, b) =>
      KIND_PRIORITY.indexOf(a.message.kind) -
      KIND_PRIORITY.indexOf(b.message.kind),
  );
  const chosen = candidates.slice(0, MAX_PER_TURN);

  const cooldownUpdates: Record<string, number> = {};
  for (const c of chosen) {
    cooldownUpdates[COOLDOWN_KEY(c.message.rivalId)] =
      currentTurn + c.cooldownTurns;
  }

  return { messages: chosen.map((c) => c.message), cooldownUpdates };
}
