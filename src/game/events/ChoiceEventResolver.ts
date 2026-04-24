import type {
  GameState,
  ChoiceEvent,
  ChoiceOption,
  EventEffect,
  EventChainState,
  EventChainId,
} from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import {
  EVENT_CHAIN_DEFINITIONS,
  getChainDefinition,
} from "./EventChainDefinitions.ts";
import { BASE_FUEL_PRICE } from "../../data/constants.ts";

// ---------------------------------------------------------------------------
// Internal: apply a single EventEffect to GameState (mirrors EventEngine logic)
// ---------------------------------------------------------------------------

function applyEffect(state: GameState, effect: EventEffect): GameState {
  switch (effect.type) {
    case "modifyCash": {
      return { ...state, cash: Math.round((state.cash + effect.value) * 100) / 100 };
    }

    case "modifyReputation": {
      return {
        ...state,
        reputation: Math.max(0, Math.min(100, state.reputation + effect.value)),
      };
    }

    case "modifyPrice": {
      if (!effect.cargoType) {
        const newFuelPrice = state.market.fuelPrice * (1 + effect.value);
        const minFuel = BASE_FUEL_PRICE * 0.5;
        const maxFuel = BASE_FUEL_PRICE * 1.5;
        return {
          ...state,
          market: {
            ...state.market,
            fuelPrice: Math.min(maxFuel, Math.max(minFuel, newFuelPrice)),
          },
        };
      }
      const updatedMarkets = { ...state.market.planetMarkets };
      const planetIds = effect.targetId
        ? [effect.targetId]
        : Object.keys(updatedMarkets);
      for (const pid of planetIds) {
        if (!updatedMarkets[pid]) continue;
        const planetMarket = { ...updatedMarkets[pid] };
        const cargoEntry = { ...planetMarket[effect.cargoType] };
        cargoEntry.eventModifier = (cargoEntry.eventModifier || 0) + effect.value;
        planetMarket[effect.cargoType] = cargoEntry;
        updatedMarkets[pid] = planetMarket;
      }
      return {
        ...state,
        market: { ...state.market, planetMarkets: updatedMarkets },
      };
    }

    case "modifyDemand": {
      const updatedMarkets = { ...state.market.planetMarkets };
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
          for (const key of Object.keys(planetMarket) as Array<keyof typeof planetMarket>) {
            const entry = { ...planetMarket[key] };
            entry.eventModifier = (entry.eventModifier || 0) + effect.value;
            planetMarket[key] = entry;
          }
        }
        updatedMarkets[pid] = planetMarket;
      }
      return {
        ...state,
        market: { ...state.market, planetMarkets: updatedMarkets },
      };
    }

    case "modifySpeed":
    case "blockRoute":
    case "blockPassengers":
    case "groundEmpireRoutes":
    case "blockImport":
    case "removeBans":
    case "modifyTariff":
    case "closeBorders":
    case "openBorders":
    case "declareWar":
    case "signPeace":
    case "formAlliance":
    case "formTradePact":
    case "degradeRelation": {
      // These effects are handled at the simulation layer via activeEvents.
      // ChoiceOption effects using these types are acknowledged but not mutated here.
      return state;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: apply all effects from a ChoiceOption
// ---------------------------------------------------------------------------

function applyChoiceEffects(state: GameState, option: ChoiceOption): GameState {
  let nextState = state;
  for (const effect of option.effects) {
    nextState = applyEffect(nextState, effect);
  }
  return nextState;
}

// ---------------------------------------------------------------------------
// Internal: deduct AP cost
// ---------------------------------------------------------------------------

function deductAp(state: GameState, ap: number): GameState {
  return {
    ...state,
    actionPoints: {
      ...state.actionPoints,
      current: state.actionPoints.current - ap,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal: build a ChoiceEvent for a given chain step
// ---------------------------------------------------------------------------

function buildChainChoiceEvent(
  chain: EventChainState,
  turn: number,
): ChoiceEvent | null {
  const definition = getChainDefinition(chain.chainId);
  if (!definition) return null;

  const step = definition.steps[chain.currentStep];
  if (!step) return null;

  const eventId = `chain_${chain.chainId}_step${chain.currentStep}_${turn}`;

  return {
    id: eventId,
    eventId: step.eventId ?? `${chain.chainId}_step${chain.currentStep}`,
    prompt: step.prompt,
    options: step.options,
    chainId: chain.chainId,
    chainStep: chain.currentStep,
    turnCreated: turn,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a player's choice on a pending ChoiceEvent.
 *
 * 1. Find the ChoiceEvent in pendingChoiceEvents by id
 * 2. Find the selected ChoiceOption by id
 * 3. Validate requirements (AP, cash, reputation)
 * 4. Apply all effects from the option
 * 5. Remove the ChoiceEvent from pendingChoiceEvents
 * 6. If chain-linked, advance the EventChainState's step
 * 7. Return updated GameState
 *
 * Throws if choiceEventId or choiceOptionId is not found, or if requirements
 * are not met.
 */
export function resolveChoiceEvent(
  state: GameState,
  choiceEventId: string,
  choiceOptionId: string,
): GameState {
  // 1. Find the pending event
  const event = state.pendingChoiceEvents.find((e) => e.id === choiceEventId);
  if (!event) {
    throw new Error(`ChoiceEvent not found: ${choiceEventId}`);
  }

  // 2. Find the chosen option
  const option = event.options.find((o) => o.id === choiceOptionId);
  if (!option) {
    throw new Error(
      `ChoiceOption not found: ${choiceOptionId} in event ${choiceEventId}`,
    );
  }

  // 3. Validate requirements
  if (option.requiresAp !== undefined && option.requiresAp > 0) {
    if (state.actionPoints.current < option.requiresAp) {
      throw new Error(
        `Insufficient AP: need ${option.requiresAp}, have ${state.actionPoints.current}`,
      );
    }
  }
  if (option.requiresCash !== undefined && option.requiresCash > 0) {
    if (state.cash < option.requiresCash) {
      throw new Error(
        `Insufficient cash: need ${option.requiresCash}, have ${state.cash}`,
      );
    }
  }
  if (option.requiresReputation !== undefined && option.requiresReputation > 0) {
    if (state.reputation < option.requiresReputation) {
      throw new Error(
        `Insufficient reputation: need ${option.requiresReputation}, have ${state.reputation}`,
      );
    }
  }

  let nextState = state;

  // 4a. Deduct AP if required
  if (option.requiresAp !== undefined && option.requiresAp > 0) {
    nextState = deductAp(nextState, option.requiresAp);
  }

  // 4b. Apply effects
  nextState = applyChoiceEffects(nextState, option);

  // 5. Remove the resolved event from pending list
  nextState = {
    ...nextState,
    pendingChoiceEvents: nextState.pendingChoiceEvents.filter(
      (e) => e.id !== choiceEventId,
    ),
  };

  // 6. Advance the EventChainState if this was a chain event
  if (event.chainId !== undefined) {
    const chainId = event.chainId as EventChainId;
    nextState = {
      ...nextState,
      activeEventChains: nextState.activeEventChains.map((chain) => {
        if (chain.chainId !== chainId) return chain;
        return {
          ...chain,
          currentStep: chain.currentStep + 1,
          data: {
            ...chain.data,
            [`step${chain.currentStep}_choice`]: choiceOptionId,
            lastStepTurn: nextState.turn,
          },
        };
      }),
    };

    // If we've advanced past totalSteps, remove the chain (it's complete)
    nextState = {
      ...nextState,
      activeEventChains: nextState.activeEventChains.filter(
        (chain) => chain.chainId !== chainId || chain.currentStep < chain.totalSteps,
      ),
    };
  }

  return nextState;
}

/**
 * Tick all active event chains.
 *
 * For each active chain, checks whether the current step's delayTurns have
 * elapsed since the last step was presented (tracked in chain.data.lastStepTurn).
 * If elapsed AND there's no pending ChoiceEvent already for this chain step,
 * generates a new ChoiceEvent and adds it to pendingChoiceEvents.
 */
export function tickEventChains(state: GameState, _rng: SeededRNG): GameState {
  if (state.activeEventChains.length === 0) return state;

  let nextState = state;
  const pendingChainIds = new Set(
    state.pendingChoiceEvents
      .filter((e) => e.chainId !== undefined)
      .map((e) => e.chainId),
  );

  for (const chain of nextState.activeEventChains) {
    // Skip if there's already a pending event for this chain
    if (pendingChainIds.has(chain.chainId)) continue;

    // Skip if chain is complete
    const definition = getChainDefinition(chain.chainId);
    if (!definition) continue;
    if (chain.currentStep >= chain.totalSteps) continue;

    const step = definition.steps[chain.currentStep];
    if (!step) continue;

    // Determine when the last step was presented
    const lastStepTurn =
      chain.currentStep === 0
        ? chain.startTurn
        : (chain.data.lastStepTurn as number | undefined) ?? chain.startTurn;

    const turnsElapsed = nextState.turn - lastStepTurn;

    if (turnsElapsed >= step.delayTurns) {
      const choiceEvent = buildChainChoiceEvent(chain, nextState.turn);
      if (choiceEvent) {
        nextState = {
          ...nextState,
          pendingChoiceEvents: [...nextState.pendingChoiceEvents, choiceEvent],
        };
        // Update lastStepTurn in chain data so we don't re-fire it
        nextState = {
          ...nextState,
          activeEventChains: nextState.activeEventChains.map((c) => {
            if (c.chainId !== chain.chainId) return c;
            return {
              ...c,
              data: { ...c.data, lastStepTurn: nextState.turn },
            };
          }),
        };
      }
    }
  }

  return nextState;
}

/**
 * Check all chain trigger conditions and start any newly-qualifying chains.
 *
 * Only starts a chain if:
 * - Its trigger condition returns true
 * - The chain isn't already active
 * - There are no other active chains (one chain at a time)
 */
export function checkChainTriggers(state: GameState, _rng: SeededRNG): GameState {
  // Don't start a new chain if one is already active
  if (state.activeEventChains.length > 0) return state;

  let nextState = state;

  for (const definition of EVENT_CHAIN_DEFINITIONS) {
    // Don't start a chain that's already active (shouldn't happen but be safe)
    if (nextState.activeEventChains.some((c) => c.chainId === definition.chainId)) {
      continue;
    }

    if (definition.triggerCondition(nextState)) {
      const newChain: EventChainState = {
        chainId: definition.chainId,
        currentStep: 0,
        totalSteps: definition.steps.length,
        startTurn: nextState.turn,
        data: {},
      };
      nextState = {
        ...nextState,
        activeEventChains: [...nextState.activeEventChains, newChain],
      };
      // Only start one chain per turn
      break;
    }
  }

  return nextState;
}
