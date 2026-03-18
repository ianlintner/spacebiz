import type {
  GameEvent,
  GameState,
  StorytellerState,
  StarSystem,
  Planet,
  ActiveRoute,
  EventEffect,
} from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { EVENT_TEMPLATES } from "./EventDefinitions.ts";
import type { EventTemplate } from "./EventDefinitions.ts";

// ---------------------------------------------------------------------------
// Galaxy shape expected by selectEvents (avoids importing full GameState)
// ---------------------------------------------------------------------------
export interface GalaxyInfo {
  systems: StarSystem[];
  planets: Planet[];
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
): { targetId: string; targetName: string } {
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
  const { targetId, targetName } = pickTarget(
    rng,
    template,
    galaxy,
    activeRoutes,
  );

  const effects: EventEffect[] = template.effects.map((e) => ({
    ...e,
    targetId: e.targetId ?? targetId,
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
          const newFuelPrice =
            nextState.market.fuelPrice *
            (1 + effect.value);
          nextState = {
            ...nextState,
            market: {
              ...nextState.market,
              fuelPrice: Math.max(1, newFuelPrice),
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
            entry.eventModifier =
              (entry.eventModifier || 0) + effect.value;
            planetMarket[effect.cargoType] = entry;
          } else {
            // Apply to all cargo types
            for (const key of Object.keys(planetMarket) as Array<
              keyof typeof planetMarket
            >) {
              const entry = { ...planetMarket[key] };
              entry.eventModifier =
                (entry.eventModifier || 0) + effect.value;
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
    }
  }

  return nextState;
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
