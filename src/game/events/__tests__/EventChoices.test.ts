import { describe, it, expect } from "vitest";
import { EVENT_TEMPLATES } from "../EventDefinitions.ts";
import {
  resolveChoiceEvent,
  tickEventChains,
  checkChainTriggers,
} from "../ChoiceEventResolver.ts";
import { EVENT_CHAIN_DEFINITIONS } from "../EventChainDefinitions.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import {
  CargoType,
  PlanetType,
  ShipClass,
  EventCategory,
} from "../../../data/types.ts";
import type {
  GameState,
  ChoiceEvent,
  EventChainState,
  StarSystem,
  Planet,
} from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
} from "../../../data/constants.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlanetMarkets(
  planets: Planet[],
): GameState["market"]["planetMarkets"] {
  const planetMarkets: GameState["market"]["planetMarkets"] = {};
  for (const planet of planets) {
    const market: Record<
      string,
      {
        baseSupply: number;
        baseDemand: number;
        currentPrice: number;
        saturation: number;
        trend: "stable";
        trendMomentum: number;
        eventModifier: number;
      }
    > = {};
    for (const ct of Object.values(CargoType)) {
      market[ct] = {
        baseSupply: 100,
        baseDemand: 100,
        currentPrice: 20,
        saturation: 0,
        trend: "stable",
        trendMomentum: 0,
        eventModifier: 0,
      };
    }
    planetMarkets[planet.id] =
      market as GameState["market"]["planetMarkets"][string];
  }
  return planetMarkets;
}

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  const systems: StarSystem[] = [
    {
      id: "sys-1",
      name: "Sol",
      sectorId: "sec-1",
      empireId: "emp-1",
      x: 0,
      y: 0,
      starColor: 0xffcc00,
    },
  ];
  const planets: Planet[] = [
    {
      id: "planet-1-1-0",
      name: "Earth",
      systemId: "sys-1",
      type: PlanetType.Terran,
      x: 0,
      y: 0,
      population: 1_000_000,
    },
  ];

  return {
    seed: 42,
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "emp-1",
    galaxy: {
      sectors: [{ id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff }],
      empires: [],
      systems,
      planets,
    },
    fleet: [
      {
        id: "ship-1",
        name: "Shuttle Alpha",
        class: ShipClass.CargoShuttle,
        cargoCapacity: 80,
        passengerCapacity: 0,
        speed: 4,
        fuelEfficiency: 0.8,
        reliability: 92,
        age: 0,
        condition: 100,
        purchaseCost: 40000,
        maintenanceCost: 2000,
        assignedRouteId: null,
      },
    ],
    activeRoutes: [],
    market: {
      fuelPrice: BASE_FUEL_PRICE,
      fuelTrend: "stable",
      planetMarkets: makePlanetMarkets(planets),
    },
    aiCompanies: [],
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
      turnsSinceLastDecision: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
    routeSlots: 4,
    unlockedEmpireIds: [],
    contracts: [],
    tech: {
      researchPoints: 0,
      completedTechIds: [],
      currentResearchId: null,
      researchProgress: 0,
    },
    empireTradePolicies: {},
    interEmpireCargoLocks: [],
    stationHub: null,
    saveVersion: 6,
    actionPoints: { current: 3, max: 3 },
    turnBrief: [],
    pendingChoiceEvents: [],
    activeEventChains: [],
    captains: [],
    routeMarket: [],
    researchEvents: [],
    unlockedNavTabs: [
      "map",
      "routes",
      "fleet",
      "finance",
    ] as import("../../../data/types.ts").NavTabId[],
    reputationTier:
      "unknown" as import("../../../data/types.ts").ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

function makePendingChoiceEvent(
  overrides: Partial<ChoiceEvent> = {},
): ChoiceEvent {
  return {
    id: "test-choice-001",
    eventId: "pirate_activity",
    prompt: "Pirates are threatening your routes. What do you do?",
    options: [
      {
        id: "pay_protection",
        label: "Pay protection",
        outcomeDescription: "Pay and move on.",
        effects: [{ type: "modifyCash", value: -2000 }],
        requiresCash: 2000,
      },
      {
        id: "fight_back",
        label: "Fight back",
        outcomeDescription: "Risk it for the biscuit.",
        effects: [{ type: "modifyReputation", value: 3 }],
        requiresAp: 1,
      },
      {
        id: "ignore_pirates",
        label: "Ignore them",
        outcomeDescription: "Hope for the best.",
        effects: [],
      },
    ],
    turnCreated: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Event templates have choices defined
// ---------------------------------------------------------------------------

describe("EventDefinitions — choices spot-check", () => {
  it("pirateActivity has choiceOptions with 3 entries", () => {
    const template = EVENT_TEMPLATES.find((t) => t.id === "pirate_activity");
    expect(template).toBeDefined();
    expect(template!.choiceOptions).toBeDefined();
    expect(template!.choiceOptions!.length).toBe(3);
  });

  it("fuelShortage has choiceOptions with 3 entries", () => {
    const template = EVENT_TEMPLATES.find((t) => t.id === "fuel_shortage");
    expect(template).toBeDefined();
    expect(template!.choiceOptions).toBeDefined();
    expect(template!.choiceOptions!.length).toBe(3);
  });

  it("warDeclaration has choiceOptions with 3 entries", () => {
    const template = EVENT_TEMPLATES.find((t) => t.id === "war_declaration");
    expect(template).toBeDefined();
    expect(template!.choiceOptions).toBeDefined();
    expect(template!.choiceOptions!.length).toBe(3);
  });

  it("smugglingOpportunity has both legacy choices and new choiceOptions", () => {
    const template = EVENT_TEMPLATES.find(
      (t) => t.id === "smuggling_opportunity",
    );
    expect(template).toBeDefined();
    expect(template!.choices).toBeDefined();
    expect(template!.choiceOptions).toBeDefined();
    expect(template!.choiceOptions!.length).toBe(3);
  });

  it("derelictShip has choiceOptions with 3 entries", () => {
    const template = EVENT_TEMPLATES.find((t) => t.id === "derelict_ship");
    expect(template).toBeDefined();
    expect(template!.choiceOptions).toBeDefined();
    expect(template!.choiceOptions!.length).toBe(3);
  });

  it("all choiceOptions have required id, label, outcomeDescription, effects", () => {
    for (const template of EVENT_TEMPLATES) {
      if (!template.choiceOptions) continue;
      for (const option of template.choiceOptions) {
        expect(option.id, `${template.id}: option missing id`).toBeTruthy();
        expect(
          option.label,
          `${template.id}: option missing label`,
        ).toBeTruthy();
        expect(
          option.outcomeDescription,
          `${template.id}: option missing outcomeDescription`,
        ).toBeTruthy();
        expect(Array.isArray(option.effects)).toBe(true);
      }
    }
  });

  it("events with requiresChoice:true have at least choiceOptions or choices", () => {
    const requiresChoiceTemplates = EVENT_TEMPLATES.filter(
      (t) => t.requiresChoice,
    );
    expect(requiresChoiceTemplates.length).toBeGreaterThan(0);
    for (const template of requiresChoiceTemplates) {
      const hasChoices =
        (template.choices && template.choices.length > 0) ||
        (template.choiceOptions && template.choiceOptions.length > 0);
      expect(
        hasChoices,
        `${template.id} requiresChoice=true but no choices defined`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. resolveChoiceEvent — core behaviour
// ---------------------------------------------------------------------------

describe("resolveChoiceEvent", () => {
  it("applies modifyCash effect correctly", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    const result = resolveChoiceEvent(state, event.id, "pay_protection");

    expect(result.cash).toBe(STARTING_CASH - 2000);
  });

  it("applies modifyReputation effect correctly", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    const result = resolveChoiceEvent(state, event.id, "fight_back");

    expect(result.reputation).toBe(53); // 50 + 3
  });

  it("removes event from pendingChoiceEvents after resolution", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    const result = resolveChoiceEvent(state, event.id, "ignore_pirates");

    expect(result.pendingChoiceEvents).toHaveLength(0);
  });

  it("deducts AP when requiresAp is set", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      actionPoints: { current: 3, max: 3 },
    });

    const result = resolveChoiceEvent(state, event.id, "fight_back");

    expect(result.actionPoints.current).toBe(2); // 3 - 1
  });

  it("throws if choiceEventId is not found", () => {
    const state = makeMinimalState();
    expect(() =>
      resolveChoiceEvent(state, "nonexistent-event", "some-option"),
    ).toThrow("ChoiceEvent not found");
  });

  it("throws if choiceOptionId is not found", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    expect(() =>
      resolveChoiceEvent(state, event.id, "nonexistent-option"),
    ).toThrow("ChoiceOption not found");
  });

  it("throws if requiresCash is not met", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      cash: 500, // less than requiresCash: 2000
    });

    expect(() => resolveChoiceEvent(state, event.id, "pay_protection")).toThrow(
      "Insufficient cash",
    );
  });

  it("throws if requiresAp is not met", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      actionPoints: { current: 0, max: 3 },
    });

    expect(() => resolveChoiceEvent(state, event.id, "fight_back")).toThrow(
      "Insufficient AP",
    );
  });

  it("throws if requiresReputation is not met", () => {
    const event = makePendingChoiceEvent({
      options: [
        {
          id: "rep_option",
          label: "High rep option",
          outcomeDescription: "Needs high rep.",
          effects: [],
          requiresReputation: 80,
        },
      ],
    });
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      reputation: 30,
    });

    expect(() => resolveChoiceEvent(state, event.id, "rep_option")).toThrow(
      "Insufficient reputation",
    );
  });

  it("keeps other pending events when resolving one", () => {
    const event1 = makePendingChoiceEvent({ id: "event-1" });
    const event2 = makePendingChoiceEvent({ id: "event-2" });
    const state = makeMinimalState({ pendingChoiceEvents: [event1, event2] });

    const result = resolveChoiceEvent(state, "event-1", "ignore_pirates");

    expect(result.pendingChoiceEvents).toHaveLength(1);
    expect(result.pendingChoiceEvents[0].id).toBe("event-2");
  });
});

// ---------------------------------------------------------------------------
// 3. resolveChoiceEvent — chain advancement
// ---------------------------------------------------------------------------

describe("resolveChoiceEvent — chain advancement", () => {
  it("advances currentStep when resolving a chain event", () => {
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 0,
      totalSteps: 4,
      startTurn: 1,
      data: {},
    };
    const event = makePendingChoiceEvent({
      chainId: "pirate_campaign",
      chainStep: 0,
    });
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      activeEventChains: [chainState],
    });

    const result = resolveChoiceEvent(state, event.id, "ignore_pirates");

    expect(result.activeEventChains[0].currentStep).toBe(1);
  });

  it("records chosen option id in chain data", () => {
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 0,
      totalSteps: 4,
      startTurn: 1,
      data: {},
    };
    const event = makePendingChoiceEvent({
      chainId: "pirate_campaign",
      chainStep: 0,
    });
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      activeEventChains: [chainState],
    });

    const result = resolveChoiceEvent(state, event.id, "ignore_pirates");

    expect(result.activeEventChains[0].data["step0_choice"]).toBe(
      "ignore_pirates",
    );
  });

  it("removes chain when all steps completed", () => {
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 3, // last step (totalSteps=4, so step 3 is the last)
      totalSteps: 4,
      startTurn: 1,
      data: {},
    };
    const event = makePendingChoiceEvent({
      chainId: "pirate_campaign",
      chainStep: 3,
    });
    const state = makeMinimalState({
      pendingChoiceEvents: [event],
      activeEventChains: [chainState],
    });

    const result = resolveChoiceEvent(state, event.id, "ignore_pirates");

    expect(result.activeEventChains).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. checkChainTriggers
// ---------------------------------------------------------------------------

describe("checkChainTriggers", () => {
  it("does not start a chain if one is already active", () => {
    const existingChain: EventChainState = {
      chainId: "plague",
      currentStep: 0,
      totalSteps: 3,
      startTurn: 1,
      data: {},
    };
    // Meet pirate_campaign trigger condition (turn >= 5, no active chains)
    // But we force an existing chain — should NOT add another
    const state = makeMinimalState({
      turn: 10,
      activeEventChains: [existingChain],
    });
    const rng = new SeededRNG(42);

    const result = checkChainTriggers(state, rng);

    expect(result.activeEventChains).toHaveLength(1);
    expect(result.activeEventChains[0].chainId).toBe("plague");
  });

  it("starts pirate_campaign chain when turn >= 5 and no active chains", () => {
    const state = makeMinimalState({
      turn: 5,
      activeEventChains: [],
    });
    const rng = new SeededRNG(42);

    const result = checkChainTriggers(state, rng);

    expect(result.activeEventChains).toHaveLength(1);
    expect(result.activeEventChains[0].chainId).toBe("pirate_campaign");
    expect(result.activeEventChains[0].currentStep).toBe(0);
    expect(result.activeEventChains[0].totalSteps).toBe(4);
  });

  it("does not start pirate_campaign before turn 5", () => {
    const state = makeMinimalState({
      turn: 3,
      activeEventChains: [],
    });
    const rng = new SeededRNG(42);

    const result = checkChainTriggers(state, rng);

    // pirate_campaign requires turn >= 5, so it should NOT trigger at turn 3
    const pirateCampaign = result.activeEventChains.find(
      (c) => c.chainId === "pirate_campaign",
    );
    expect(pirateCampaign).toBeUndefined();
  });

  it("records correct startTurn on new chain", () => {
    const state = makeMinimalState({ turn: 7, activeEventChains: [] });
    const rng = new SeededRNG(42);

    const result = checkChainTriggers(state, rng);

    expect(result.activeEventChains[0].startTurn).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 5. tickEventChains
// ---------------------------------------------------------------------------

describe("tickEventChains", () => {
  it("returns state unchanged if no active chains", () => {
    const state = makeMinimalState({ activeEventChains: [] });
    const rng = new SeededRNG(42);

    const result = tickEventChains(state, rng);

    expect(result.pendingChoiceEvents).toHaveLength(0);
    expect(result.activeEventChains).toHaveLength(0);
  });

  it("adds step 0 event immediately (delayTurns=0) when chain starts", () => {
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 0,
      totalSteps: 4,
      startTurn: 5,
      data: {},
    };
    const state = makeMinimalState({
      turn: 5,
      activeEventChains: [chainState],
      pendingChoiceEvents: [],
    });
    const rng = new SeededRNG(42);

    const result = tickEventChains(state, rng);

    // pirate_campaign step 0 has delayTurns: 0, so it fires on the same turn
    expect(result.pendingChoiceEvents).toHaveLength(1);
    expect(result.pendingChoiceEvents[0].chainId).toBe("pirate_campaign");
    expect(result.pendingChoiceEvents[0].chainStep).toBe(0);
  });

  it("does not add duplicate pending events for same chain step", () => {
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 0,
      totalSteps: 4,
      startTurn: 5,
      data: {},
    };
    const existingPending: ChoiceEvent = {
      id: "chain_pirate_campaign_step0_5",
      eventId: "pirate_activity",
      prompt: "Existing prompt",
      options: [],
      chainId: "pirate_campaign",
      chainStep: 0,
      turnCreated: 5,
    };
    const state = makeMinimalState({
      turn: 5,
      activeEventChains: [chainState],
      pendingChoiceEvents: [existingPending],
    });
    const rng = new SeededRNG(42);

    const result = tickEventChains(state, rng);

    // Should NOT add another pending event for the same chain
    const pirateEvents = result.pendingChoiceEvents.filter(
      (e) => e.chainId === "pirate_campaign",
    );
    expect(pirateEvents).toHaveLength(1);
  });

  it("respects delayTurns — does not add step 1 event before delay elapses", () => {
    // pirate_campaign step 1 has delayTurns: 3
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 1,
      totalSteps: 4,
      startTurn: 5,
      data: { lastStepTurn: 5 }, // step 0 was presented at turn 5
    };
    const state = makeMinimalState({
      turn: 7, // only 2 turns elapsed, need 3
      activeEventChains: [chainState],
      pendingChoiceEvents: [],
    });
    const rng = new SeededRNG(42);

    const result = tickEventChains(state, rng);

    expect(result.pendingChoiceEvents).toHaveLength(0);
  });

  it("adds step 1 event after delay elapses", () => {
    // pirate_campaign step 1 has delayTurns: 3
    const chainState: EventChainState = {
      chainId: "pirate_campaign",
      currentStep: 1,
      totalSteps: 4,
      startTurn: 5,
      data: { lastStepTurn: 5 }, // step 0 was presented at turn 5
    };
    const state = makeMinimalState({
      turn: 8, // 3 turns elapsed — should fire
      activeEventChains: [chainState],
      pendingChoiceEvents: [],
    });
    const rng = new SeededRNG(42);

    const result = tickEventChains(state, rng);

    expect(result.pendingChoiceEvents).toHaveLength(1);
    expect(result.pendingChoiceEvents[0].chainId).toBe("pirate_campaign");
    expect(result.pendingChoiceEvents[0].chainStep).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 6. EventChainDefinitions — spot-check structure
// ---------------------------------------------------------------------------

describe("EventChainDefinitions", () => {
  it("has exactly 6 chain definitions", () => {
    expect(EVENT_CHAIN_DEFINITIONS).toHaveLength(6);
  });

  it("all chain definitions have required fields", () => {
    for (const def of EVENT_CHAIN_DEFINITIONS) {
      expect(def.chainId, "missing chainId").toBeTruthy();
      expect(def.name, "missing name").toBeTruthy();
      expect(def.description, "missing description").toBeTruthy();
      expect(Array.isArray(def.steps), "steps should be array").toBe(true);
      expect(def.steps.length, `${def.chainId} has no steps`).toBeGreaterThan(
        0,
      );
      expect(
        typeof def.triggerCondition,
        "triggerCondition should be function",
      ).toBe("function");
    }
  });

  it("pirate_campaign has 4 steps", () => {
    const def = EVENT_CHAIN_DEFINITIONS.find(
      (d) => d.chainId === "pirate_campaign",
    );
    expect(def).toBeDefined();
    expect(def!.steps).toHaveLength(4);
  });

  it("empire_succession has 4 steps", () => {
    const def = EVENT_CHAIN_DEFINITIONS.find(
      (d) => d.chainId === "empire_succession",
    );
    expect(def).toBeDefined();
    expect(def!.steps).toHaveLength(4);
  });

  it("diplomatic_crisis, plague, fuel_crisis, black_market_scandal each have 3 steps", () => {
    const threeStepChains = [
      "diplomatic_crisis",
      "plague",
      "fuel_crisis",
      "black_market_scandal",
    ];
    for (const chainId of threeStepChains) {
      const def = EVENT_CHAIN_DEFINITIONS.find((d) => d.chainId === chainId);
      expect(def, `${chainId} not found`).toBeDefined();
      expect(def!.steps, `${chainId} should have 3 steps`).toHaveLength(3);
    }
  });

  it("all chain steps have options with at least 1 entry", () => {
    for (const def of EVENT_CHAIN_DEFINITIONS) {
      for (const step of def.steps) {
        expect(
          step.options.length,
          `${def.chainId} step ${step.stepIndex} has no options`,
        ).toBeGreaterThan(0);
        for (const option of step.options) {
          expect(
            option.id,
            `${def.chainId} step ${step.stepIndex} option missing id`,
          ).toBeTruthy();
          expect(
            option.label,
            `${def.chainId} step ${step.stepIndex} option missing label`,
          ).toBeTruthy();
        }
      }
    }
  });

  it("step indices are sequential starting from 0", () => {
    for (const def of EVENT_CHAIN_DEFINITIONS) {
      def.steps.forEach((step, i) => {
        expect(step.stepIndex).toBe(i);
      });
    }
  });

  it("EventCategory is referenced correctly in templates with choices", () => {
    const templates = EVENT_TEMPLATES.filter(
      (t) => t.choiceOptions && t.choiceOptions.length > 0,
    );
    for (const t of templates) {
      expect(Object.values(EventCategory)).toContain(t.category);
    }
  });
});

// ---------------------------------------------------------------------------
// Dilemma success% scaling — magnitude-only model.
// ---------------------------------------------------------------------------

describe("resolveChoiceEvent — dilemma success% scaling", () => {
  it("scales modifyCash magnitude by success%", () => {
    const event: ChoiceEvent = {
      id: "dilemma-1",
      eventId: "test_dilemma",
      prompt: "test",
      options: [
        {
          id: "spend",
          label: "Spend",
          outcomeDescription: "",
          effects: [{ type: "modifyCash", value: -10000 }],
        },
      ],
      turnCreated: 1,
      optionSuccess: { spend: 50 },
      dilemmaId: "test_dilemma",
    };
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    const result = resolveChoiceEvent(state, event.id, "spend");

    // 50% scales -10000 to -5000.
    expect(result.cash).toBe(STARTING_CASH - 5000);
  });

  it("respects the 10% magnitude floor", () => {
    const event: ChoiceEvent = {
      id: "dilemma-2",
      eventId: "test_dilemma",
      prompt: "test",
      options: [
        {
          id: "spend",
          label: "Spend",
          outcomeDescription: "",
          effects: [{ type: "modifyCash", value: -10000 }],
        },
      ],
      turnCreated: 1,
      optionSuccess: { spend: 5 }, // below the 10% floor
      dilemmaId: "test_dilemma",
    };
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    const result = resolveChoiceEvent(state, event.id, "spend");

    // Floor at 10% → -1000.
    expect(result.cash).toBe(STARTING_CASH - 1000);
  });

  it("does not scale when no optionSuccess provided (legacy choice events)", () => {
    const event = makePendingChoiceEvent();
    const state = makeMinimalState({ pendingChoiceEvents: [event] });

    // Legacy event has no optionSuccess; resolver should apply 100% magnitude.
    const result = resolveChoiceEvent(state, event.id, "pay_protection");

    expect(result.cash).toBe(STARTING_CASH - 2000);
  });
});
