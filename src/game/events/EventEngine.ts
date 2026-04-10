import type {
  GameEvent,
  GameState,
  StorytellerState,
  StarSystem,
  Planet,
  ActiveRoute,
  EventEffect,
  Empire,
  Ship,
} from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { EVENT_TEMPLATES } from "./EventDefinitions.ts";
import type { EventTemplate } from "./EventDefinitions.ts";
import { MOTHBALL_FEE_RATIO, BASE_FUEL_PRICE } from "../../data/constants.ts";
import { getEmpireForPlanet } from "../empire/EmpireAccessManager.ts";
import { hasTechEffect } from "../tech/TechEffects.ts";
import { setDiplomaticStatus } from "../empire/DiplomacyManager.ts";
import { updateBorderPorts } from "../empire/EmpireBorderManager.ts";

// ---------------------------------------------------------------------------
// Galaxy shape expected by selectEvents (avoids importing full GameState)
// ---------------------------------------------------------------------------
export interface GalaxyInfo {
  systems: StarSystem[];
  planets: Planet[];
  empires?: Empire[];
}

// ---------------------------------------------------------------------------
// selectEvents — pick 1-3 events for the current turn
// ---------------------------------------------------------------------------

/**
 * Weighted random selection of an index from an array of weights.
 */
function weightedPick(rng: SeededRNG, weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return rng.nextInt(0, weights.length - 1);

  let roll = rng.nextFloat(0, total);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Build the effective weight for every template, incorporating storyteller bias.
 */
function computeWeights(
  templates: EventTemplate[],
  storyteller: StorytellerState,
): number[] {
  return templates.map((t) => {
    let w = t.weight;
    if (storyteller.headwindBias > 0) {
      // Player is doing well → boost headwind events
      w += storyteller.headwindBias * t.headwindWeight;
    } else if (storyteller.headwindBias < 0) {
      // Player is struggling → boost tailwind events
      w += Math.abs(storyteller.headwindBias) * t.tailwindWeight;
    }
    return Math.max(0, w);
  });
}

/**
 * Fill in a concrete targetId by picking a random entity from the galaxy.
 * Returns the targetId and a display name for description substitution.
 */
function pickTarget(
  rng: SeededRNG,
  template: EventTemplate,
  galaxy: GalaxyInfo,
  activeRoutes: ActiveRoute[],
): {
  targetId: string;
  targetName: string;
  empireId?: string;
  empireId2?: string;
} {
  const empires = galaxy.empires ?? [];

  // Empire-pair events: Trade Embargo, Tariff War, Diplomatic events
  const needsEmpirePair = template.effects.some(
    (e) =>
      e.type === "groundEmpireRoutes" ||
      e.type === "modifyTariff" ||
      e.type === "declareWar" ||
      e.type === "signPeace" ||
      e.type === "formAlliance" ||
      e.type === "formTradePact" ||
      e.type === "closeBorders" ||
      e.type === "openBorders" ||
      e.type === "degradeRelation",
  );
  if (needsEmpirePair && empires.length >= 2) {
    const idxA = rng.nextInt(0, empires.length - 1);
    let idxB = rng.nextInt(0, empires.length - 2);
    if (idxB >= idxA) idxB++;
    const empA = empires[idxA];
    const empB = empires[idxB];
    return {
      targetId: empA.id,
      targetName: `${empA.name} and ${empB.name}`,
      empireId: empA.id,
      empireId2: empB.id,
    };
  }

  // Single-empire events: Import Crackdown, Free Trade Summit, Smuggling Opportunity
  const needsEmpire = template.effects.some(
    (e) => e.type === "blockImport" || e.type === "removeBans",
  );
  const isSmuggling = template.id === "smuggling_opportunity";
  if ((needsEmpire || isSmuggling) && empires.length > 0) {
    const emp = rng.pick(empires);
    return {
      targetId: emp.id,
      targetName: emp.name,
      empireId: emp.id,
    };
  }

  // Events that block a route need a route target
  const needsRoute = template.effects.some((e) => e.type === "blockRoute");
  if (needsRoute && activeRoutes.length > 0) {
    const route = rng.pick(activeRoutes);
    return { targetId: route.id, targetName: `Route ${route.id.slice(0, 6)}` };
  }

  // Events targeting a system (speed modifiers, pirate activity)
  const needsSystem = template.effects.some((e) => e.type === "modifySpeed");
  if (needsSystem && galaxy.systems.length > 0) {
    const system = rng.pick(galaxy.systems);
    return { targetId: system.id, targetName: system.name };
  }

  // Events targeting a planet (demand modifiers, quarantine, etc.)
  const needsPlanet = template.effects.some(
    (e) =>
      e.type === "modifyDemand" ||
      e.type === "blockPassengers" ||
      e.type === "modifyPrice",
  );
  if (needsPlanet && galaxy.planets.length > 0) {
    const planet = rng.pick(galaxy.planets);
    return { targetId: planet.id, targetName: planet.name };
  }

  // Fallback: pick a planet if available
  if (galaxy.planets.length > 0) {
    const planet = rng.pick(galaxy.planets);
    return { targetId: planet.id, targetName: planet.name };
  }

  return { targetId: "", targetName: "Unknown" };
}

/**
 * Instantiate a concrete GameEvent from a template by assigning a unique id,
 * filling in targetIds, and substituting description placeholders.
 */
function instantiateEvent(
  rng: SeededRNG,
  template: EventTemplate,
  galaxy: GalaxyInfo,
  activeRoutes: ActiveRoute[],
): GameEvent {
  const { targetId, targetName, empireId, empireId2 } = pickTarget(
    rng,
    template,
    galaxy,
    activeRoutes,
  );

  const effects: EventEffect[] = template.effects.map((e) => ({
    ...e,
    targetId: e.targetId ?? targetId,
    empireId: e.empireId ?? empireId,
    empireId2: e.empireId2 ?? empireId2,
  }));

  const description = template.description.replace(/\{target\}/g, targetName);

  const event: GameEvent = {
    id: `${template.id}_${rng.nextInt(1000, 9999)}`,
    name: template.name,
    description,
    category: template.category,
    duration: template.duration,
    effects,
  };

  if (template.requiresChoice && template.choices) {
    event.requiresChoice = true;
    event.choices = template.choices.map((c) => ({
      label: c.label,
      effects: c.effects.map((e) => ({
        ...e,
        targetId: e.targetId ?? targetId,
      })),
    }));
  }

  return event;
}

/**
 * Select 1-3 events for the current turn.
 */
export function selectEvents(
  rng: SeededRNG,
  storyteller: StorytellerState,
  galaxy: GalaxyInfo,
  activeRoutes: ActiveRoute[],
): GameEvent[] {
  const count = rng.nextInt(1, 3);
  const weights = computeWeights(EVENT_TEMPLATES, storyteller);
  const chosenIndices = new Set<number>();
  const events: GameEvent[] = [];

  for (let i = 0; i < count; i++) {
    // Pick an event template (avoid duplicates within the same turn)
    let attempts = 0;
    let idx = weightedPick(rng, weights);
    while (chosenIndices.has(idx) && attempts < 20) {
      idx = weightedPick(rng, weights);
      attempts++;
    }
    chosenIndices.add(idx);

    const template = EVENT_TEMPLATES[idx];
    events.push(instantiateEvent(rng, template, galaxy, activeRoutes));
  }

  return events;
}

// ---------------------------------------------------------------------------
// applyEventEffects — mutate a copy of game state based on event effects
// ---------------------------------------------------------------------------

/**
 * Apply a single event's effects to the game state.
 * Returns a shallow-updated GameState.
 */
export function applyEventEffects(
  event: GameEvent,
  state: GameState,
): GameState {
  let nextState = { ...state };

  for (const effect of event.effects) {
    switch (effect.type) {
      case "modifyCash": {
        nextState = { ...nextState, cash: nextState.cash + effect.value };
        break;
      }

      case "modifyReputation": {
        nextState = {
          ...nextState,
          reputation: Math.max(
            0,
            Math.min(100, nextState.reputation + effect.value),
          ),
        };
        break;
      }

      case "modifyPrice": {
        // If no cargoType, this modifies fuel price
        if (!effect.cargoType) {
          const newFuelPrice = nextState.market.fuelPrice * (1 + effect.value);
          // Clamp to same range as MarketUpdater: [50%, 150%] of BASE_FUEL_PRICE
          const minFuel = BASE_FUEL_PRICE * 0.5;
          const maxFuel = BASE_FUEL_PRICE * 1.5;
          nextState = {
            ...nextState,
            market: {
              ...nextState.market,
              fuelPrice: Math.min(maxFuel, Math.max(minFuel, newFuelPrice)),
            },
          };
        } else {
          // Modify eventModifier for the cargo type across all (or targeted) planets
          const updatedMarkets = { ...nextState.market.planetMarkets };
          const planetIds = effect.targetId
            ? [effect.targetId]
            : Object.keys(updatedMarkets);

          for (const pid of planetIds) {
            if (!updatedMarkets[pid]) continue;
            const planetMarket = { ...updatedMarkets[pid] };
            const cargoEntry = { ...planetMarket[effect.cargoType] };
            cargoEntry.eventModifier =
              (cargoEntry.eventModifier || 0) + effect.value;
            planetMarket[effect.cargoType] = cargoEntry;
            updatedMarkets[pid] = planetMarket;
          }

          nextState = {
            ...nextState,
            market: {
              ...nextState.market,
              planetMarkets: updatedMarkets,
            },
          };
        }
        break;
      }

      case "modifyDemand": {
        const updatedMarkets = { ...nextState.market.planetMarkets };
        const planetIds = effect.targetId
          ? [effect.targetId]
          : Object.keys(updatedMarkets);

        for (const pid of planetIds) {
          if (!updatedMarkets[pid]) continue;
          const planetMarket = { ...updatedMarkets[pid] };

          if (effect.cargoType) {
            const entry = { ...planetMarket[effect.cargoType] };
            entry.eventModifier = (entry.eventModifier || 0) + effect.value;
            planetMarket[effect.cargoType] = entry;
          } else {
            // Apply to all cargo types
            for (const key of Object.keys(planetMarket) as Array<
              keyof typeof planetMarket
            >) {
              const entry = { ...planetMarket[key] };
              entry.eventModifier = (entry.eventModifier || 0) + effect.value;
              planetMarket[key] = entry;
            }
          }
          updatedMarkets[pid] = planetMarket;
        }

        nextState = {
          ...nextState,
          market: {
            ...nextState.market,
            planetMarkets: updatedMarkets,
          },
        };
        break;
      }

      case "modifySpeed": {
        // Modify speed of ships assigned to routes in the target system
        // For now we store the event — the simulation layer reads activeEvents
        // No direct state mutation needed beyond adding to activeEvents
        break;
      }

      case "blockRoute": {
        // Blocking is checked by simulation reading activeEvents
        break;
      }

      case "blockPassengers": {
        // Blocking is checked by simulation reading activeEvents
        break;
      }

      case "groundEmpireRoutes": {
        // Grounding is checked by isRouteGrounded / simulation layer
        break;
      }

      case "blockImport": {
        // Checked by simulation layer; temporarily adds import restriction
        break;
      }

      case "removeBans": {
        // Checked by simulation layer; temporarily lifts trade bans for empireId
        break;
      }

      case "modifyTariff": {
        // Tariff modifier is read by TariffCalculator from activeEvents
        break;
      }

      case "declareWar": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          nextState = {
            ...nextState,
            diplomaticRelations: setDiplomaticStatus(
              effect.empireId,
              effect.empireId2,
              "war",
              [...nextState.diplomaticRelations],
            ),
          };
          if (nextState.borderPorts) {
            nextState = {
              ...nextState,
              borderPorts: updateBorderPorts(
                [...nextState.borderPorts],
                nextState.galaxy.systems,
                nextState.diplomaticRelations!,
              ),
            };
          }
        }
        break;
      }

      case "signPeace": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          nextState = {
            ...nextState,
            diplomaticRelations: setDiplomaticStatus(
              effect.empireId,
              effect.empireId2,
              "peace",
              [...nextState.diplomaticRelations],
            ),
          };
          if (nextState.borderPorts) {
            nextState = {
              ...nextState,
              borderPorts: updateBorderPorts(
                [...nextState.borderPorts],
                nextState.galaxy.systems,
                nextState.diplomaticRelations!,
              ),
            };
          }
        }
        break;
      }

      case "formAlliance": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          nextState = {
            ...nextState,
            diplomaticRelations: setDiplomaticStatus(
              effect.empireId,
              effect.empireId2,
              "alliance",
              [...nextState.diplomaticRelations],
            ),
          };
          if (nextState.borderPorts) {
            nextState = {
              ...nextState,
              borderPorts: updateBorderPorts(
                [...nextState.borderPorts],
                nextState.galaxy.systems,
                nextState.diplomaticRelations!,
              ),
            };
          }
        }
        break;
      }

      case "formTradePact": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          nextState = {
            ...nextState,
            diplomaticRelations: setDiplomaticStatus(
              effect.empireId,
              effect.empireId2,
              "tradePact",
              [...nextState.diplomaticRelations],
            ),
          };
          if (nextState.borderPorts) {
            nextState = {
              ...nextState,
              borderPorts: updateBorderPorts(
                [...nextState.borderPorts],
                nextState.galaxy.systems,
                nextState.diplomaticRelations!,
              ),
            };
          }
        }
        break;
      }

      case "closeBorders": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          nextState = {
            ...nextState,
            diplomaticRelations: setDiplomaticStatus(
              effect.empireId,
              effect.empireId2,
              "coldWar",
              [...nextState.diplomaticRelations],
            ),
          };
          if (nextState.borderPorts) {
            nextState = {
              ...nextState,
              borderPorts: updateBorderPorts(
                [...nextState.borderPorts],
                nextState.galaxy.systems,
                nextState.diplomaticRelations!,
              ),
            };
          }
        }
        break;
      }

      case "openBorders": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          // Open borders implies at least peace status
          nextState = {
            ...nextState,
            diplomaticRelations: setDiplomaticStatus(
              effect.empireId,
              effect.empireId2,
              "peace",
              [...nextState.diplomaticRelations],
            ),
          };
          if (nextState.borderPorts) {
            nextState = {
              ...nextState,
              borderPorts: updateBorderPorts(
                [...nextState.borderPorts],
                nextState.galaxy.systems,
                nextState.diplomaticRelations!,
              ),
            };
          }
        }
        break;
      }

      case "degradeRelation": {
        if (
          effect.empireId &&
          effect.empireId2 &&
          nextState.diplomaticRelations
        ) {
          // Find current relation and degrade by one step
          const rel = nextState.diplomaticRelations.find(
            (r) =>
              (r.empireA === effect.empireId &&
                r.empireB === effect.empireId2) ||
              (r.empireA === effect.empireId2 && r.empireB === effect.empireId),
          );
          if (rel) {
            const ladder: Array<typeof rel.status> = [
              "war",
              "coldWar",
              "peace",
              "tradePact",
              "alliance",
            ];
            const idx = ladder.indexOf(rel.status);
            if (idx > 0) {
              nextState = {
                ...nextState,
                diplomaticRelations: setDiplomaticStatus(
                  effect.empireId,
                  effect.empireId2!,
                  ladder[idx - 1],
                  [...nextState.diplomaticRelations],
                ),
              };
              if (nextState.borderPorts) {
                nextState = {
                  ...nextState,
                  borderPorts: updateBorderPorts(
                    [...nextState.borderPorts],
                    nextState.galaxy.systems,
                    nextState.diplomaticRelations!,
                  ),
                };
              }
            }
          }
        }
        break;
      }
    }
  }

  return nextState;
}

// ---------------------------------------------------------------------------
// Route Grounding Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a route is grounded by any active event.
 * Routes can be grounded by:
 *  - "blockRoute" effect targeting the route ID
 *  - "groundEmpireRoutes" effect targeting an empire pair that the route crosses
 */
export function isRouteGrounded(
  route: ActiveRoute,
  activeEvents: GameEvent[],
  systems: StarSystem[],
  planets: { id: string; systemId: string }[],
): boolean {
  for (const event of activeEvents) {
    for (const effect of event.effects) {
      if (effect.type === "blockRoute" && effect.targetId === route.id) {
        return true;
      }
      if (
        effect.type === "groundEmpireRoutes" &&
        effect.empireId &&
        effect.empireId2
      ) {
        const originEmpire = getEmpireForPlanet(
          route.originPlanetId,
          systems,
          planets,
        );
        const destEmpire = getEmpireForPlanet(
          route.destinationPlanetId,
          systems,
          planets,
        );
        if (originEmpire && destEmpire) {
          const pair = [effect.empireId, effect.empireId2];
          if (
            pair.includes(originEmpire) &&
            pair.includes(destEmpire) &&
            originEmpire !== destEmpire
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Mothball Fee Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the mothball fee for a grounded route.
 * Fee = baseMaintenance of assigned ship × MOTHBALL_FEE_RATIO per turn.
 * Returns 0 if no ship is assigned or route is not grounded.
 */
export function calculateMothballFee(
  route: ActiveRoute,
  fleet: Ship[],
  activeEvents: GameEvent[],
  systems: StarSystem[],
  planets: { id: string; systemId: string }[],
  state?: GameState,
): number {
  if (!isRouteGrounded(route, activeEvents, systems, planets)) return 0;
  if (route.assignedShipIds.length === 0) return 0;

  // If the player has the "addEmbargoImmunity" tech, no mothball fee
  if (state && hasTechEffect(state, "addEmbargoImmunity")) return 0;

  let totalFee = 0;
  for (const shipId of route.assignedShipIds) {
    const ship = fleet.find((s) => s.id === shipId);
    if (ship) {
      totalFee += ship.maintenanceCost * MOTHBALL_FEE_RATIO;
    }
  }

  // Tech "addMothballRefund" reduces mothball fee (value is a negative multiplier)
  // This tech is handled in simulation where the refund is applied

  return Math.round(totalFee);
}

/**
 * Check if an import is temporarily blocked by an active Import Crackdown event.
 */
export function isImportBlockedByEvent(
  destEmpireId: string,
  activeEvents: GameEvent[],
): boolean {
  for (const event of activeEvents) {
    for (const effect of event.effects) {
      if (effect.type === "blockImport" && effect.empireId === destEmpireId) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if trade bans are temporarily lifted for an empire by a Free Trade Summit event.
 */
export function areBansLiftedByEvent(
  empireId: string,
  activeEvents: GameEvent[],
): boolean {
  for (const event of activeEvents) {
    for (const effect of event.effects) {
      if (effect.type === "removeBans" && effect.empireId === empireId) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get the total event-driven tariff modifier for a pair of empires.
 * Returns the additional tariff multiplier (e.g. 1.0 = doubled tariffs).
 */
export function getEventTariffModifier(
  empireA: string,
  empireB: string,
  activeEvents: GameEvent[],
): number {
  let modifier = 0;
  for (const event of activeEvents) {
    for (const effect of event.effects) {
      if (
        effect.type === "modifyTariff" &&
        effect.empireId &&
        effect.empireId2
      ) {
        const pair = [effect.empireId, effect.empireId2];
        if (pair.includes(empireA) && pair.includes(empireB)) {
          modifier += effect.value;
        }
      }
    }
  }
  return modifier;
}

// ---------------------------------------------------------------------------
// tickEvents — count down durations, remove expired events
// ---------------------------------------------------------------------------

/**
 * Tick down event durations by 1. Remove events that reach 0.
 */
export function tickEvents(activeEvents: GameEvent[]): GameEvent[] {
  return activeEvents
    .map((e) => ({ ...e, duration: e.duration - 1 }))
    .filter((e) => e.duration > 0);
}
