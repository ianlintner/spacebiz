import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type { ChoiceEvent, GameState } from "../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../data/types.ts";
import { hasTagOfKind } from "./StandingTags.ts";
import { getStandingTier } from "./StandingTiers.ts";

interface Candidate {
  readonly weight: number;
  readonly build: () => ChoiceEvent;
}

const OFFER_FIRE_PROBABILITY = 0.4;

/**
 * Pick at most one AI-initiated diplomacy offer for this turn.
 *
 * - Empires with Warm/Allied standing may offer exclusive contracts.
 * - Rivals carrying a `SuspectedSpy:player` tag may issue a warning.
 *
 * Returns null when the fire-probability roll fails or no candidates exist.
 */
export function selectDiplomacyOffer(
  rng: SeededRNG,
  state: GameState,
): ChoiceEvent | null {
  if (!rng.chance(OFFER_FIRE_PROBABILITY)) return null;

  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  const candidates: Candidate[] = [];

  // Empire offers: contracts when standing is Warm or Allied.
  // Empire-side standing lives on state.empireReputation.
  for (const e of state.galaxy?.empires ?? []) {
    const standing = state.empireReputation?.[e.id] ?? 50;
    const tier = getStandingTier(standing);
    if (tier === "Warm" || tier === "Allied") {
      candidates.push({
        weight: 3,
        build: () => ({
          id: `dipl-${state.turn}-${e.id}-contract`,
          eventId: "diplomacy:exclusiveContract",
          prompt: `${e.name ?? e.id} offers an exclusive shipping contract.`,
          options: [
            {
              id: "accept",
              label: "Accept",
              outcomeDescription: "Lock in the route.",
              effects: [],
            },
            {
              id: "decline",
              label: "Decline",
              outcomeDescription: "Politely refuse.",
              effects: [],
            },
          ],
          turnCreated: state.turn,
        }),
      });
    }
  }

  // Rival warnings: when either SuspectedSpy:player OR Sabotaged is on the
  // rival's tags. Both signal the rival is angry at the player. We don't
  // double up the candidate weight when both are present — one warning per
  // rival per turn is plenty.
  for (const r of state.aiCompanies ?? []) {
    const tags = d.rivalTags[r.id] ?? [];
    if (hasTagOfKind(tags, "SuspectedSpy") || hasTagOfKind(tags, "Sabotaged")) {
      candidates.push({
        weight: 4,
        build: () => ({
          id: `dipl-${state.turn}-${r.id}-spy`,
          eventId: "diplomacy:rivalSpyWarning",
          prompt: `${r.name ?? r.id}'s relations director makes a quiet threat about your operatives.`,
          options: [
            {
              id: "deny",
              label: "Deny everything",
              outcomeDescription: "Hold your ground.",
              effects: [],
            },
            {
              id: "apologize",
              label: "Offer an apology",
              outcomeDescription: "Concede the encounter.",
              effects: [],
            },
          ],
          turnCreated: state.turn,
        }),
      });
    }
  }

  if (candidates.length === 0) return null;

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  const roll = rng.next() * total;
  let acc = 0;
  for (const c of candidates) {
    acc += c.weight;
    if (roll <= acc) return c.build();
  }
  return candidates[candidates.length - 1]!.build();
}
