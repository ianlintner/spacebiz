import { describe, it, expect } from "vitest";
import {
  computeGiftCostForEmpire,
  getActionsForEmpire,
  getActionsForRival,
  evaluateActionState,
  buildQueuedAction,
  getPerTurnCap,
} from "../diplomacyHubHelpers.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../data/types.ts";
import type {
  AICompany,
  Empire,
  GameState,
  StarSystem,
} from "../../data/types.ts";

const empire: Empire = {
  id: "vex",
  name: "Vex Hegemony",
  color: 0xff0000,
  tariffRate: 0.1,
  disposition: "neutral",
  homeSystemId: "sys-1",
  leaderName: "Emperor Vex IX",
  leaderPortrait: { portraitId: "p1", category: "alien" },
};

const rival: AICompany = {
  id: "chen",
  name: "Chen Logistics",
  empireId: "sol",
  cash: 1_000_000,
  fleet: [],
  activeRoutes: [],
  reputation: 50,
  totalCargoDelivered: 0,
  personality: "steadyHauler",
  bankrupt: false,
  ceoName: "Chen Wei",
  ceoPortrait: { portraitId: "p2", category: "human" },
};

function makeState(
  opts: {
    systems?: number;
    cash?: number;
    reputation?: number;
    turn?: number;
    queuedCount?: number;
    cooldowns?: Record<string, number>;
  } = {},
): GameState {
  const systemList: StarSystem[] = Array.from(
    { length: opts.systems ?? 0 },
    (_, i) => ({ id: `sys-${i}`, empireId: "vex" }) as unknown as StarSystem,
  );
  return {
    seed: 1,
    turn: opts.turn ?? 5,
    cash: opts.cash ?? 100_000,
    reputation: opts.reputation ?? 50,
    galaxy: { empires: [empire], systems: systemList },
    aiCompanies: [rival],
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      queuedActions: Array.from({ length: opts.queuedCount ?? 0 }, (_, i) => ({
        id: `q${i}`,
        kind: "giftEmpire" as const,
        targetId: "vex",
        cashCost: 0,
      })),
      cooldowns: opts.cooldowns ?? {},
    },
  } as unknown as GameState;
}

describe("computeGiftCostForEmpire", () => {
  it("base cost when empire owns no systems", () => {
    expect(computeGiftCostForEmpire(empire, makeState({ systems: 0 }))).toBe(
      5_000,
    );
  });
  it("scales 1.5k per system", () => {
    expect(computeGiftCostForEmpire(empire, makeState({ systems: 4 }))).toBe(
      11_000,
    );
  });
  it("caps at 20k", () => {
    expect(computeGiftCostForEmpire(empire, makeState({ systems: 50 }))).toBe(
      20_000,
    );
  });
});

describe("getActionsForEmpire", () => {
  it("returns a single Send Gift action", () => {
    const actions = getActionsForEmpire(empire, makeState({ systems: 2 }));
    expect(actions).toHaveLength(1);
    expect(actions[0]!.kind).toBe("giftEmpire");
    expect(actions[0]!.cashCost).toBe(8_000);
  });
});

describe("getActionsForRival", () => {
  it("returns gift + three surveil lenses", () => {
    const actions = getActionsForRival(rival);
    expect(actions.map((a) => a.kind)).toEqual([
      "giftRival",
      "surveil",
      "surveil",
      "surveil",
    ]);
    expect(actions.map((a) => a.surveilLens)).toEqual([
      undefined,
      "cash",
      "topContractByValue",
      "topEmpireStanding",
    ]);
  });
});

describe("getPerTurnCap", () => {
  it("base cap = 2 below renowned reputation", () => {
    expect(getPerTurnCap(makeState({ reputation: 50 }))).toBe(2);
  });
  it("high cap = 3 at reputation >= 75", () => {
    expect(getPerTurnCap(makeState({ reputation: 75 }))).toBe(3);
    expect(getPerTurnCap(makeState({ reputation: 90 }))).toBe(3);
  });
});

describe("evaluateActionState", () => {
  const action = getActionsForEmpire(empire, makeState({ systems: 2 }))[0]!;

  it("enabled when target is fresh and cap not reached", () => {
    expect(evaluateActionState(action, "vex", makeState()).enabled).toBe(true);
  });

  it("disables on cap (queued count >= cap)", () => {
    const r = evaluateActionState(action, "vex", makeState({ queuedCount: 2 }));
    expect(r.enabled).toBe(false);
    expect(r.reasonIfDisabled).toBe("cap");
  });

  it("disables on cooldown and surfaces turns remaining", () => {
    const r = evaluateActionState(
      action,
      "vex",
      makeState({ turn: 5, cooldowns: { "giftEmpire:vex": 8 } }),
    );
    expect(r.enabled).toBe(false);
    expect(r.reasonIfDisabled).toBe("cooldown");
    expect(r.cooldownTurnsRemaining).toBe(3);
  });

  it("disables on insufficient cash", () => {
    const r = evaluateActionState(action, "vex", makeState({ cash: 100 }));
    expect(r.enabled).toBe(false);
    expect(r.reasonIfDisabled).toBe("cash");
  });

  it("cap takes precedence over cooldown", () => {
    const r = evaluateActionState(
      action,
      "vex",
      makeState({
        queuedCount: 2,
        cooldowns: { "giftEmpire:vex": 99 },
      }),
    );
    expect(r.reasonIfDisabled).toBe("cap");
  });
});

describe("buildQueuedAction", () => {
  it("constructs gift action without surveilLens", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 }))[0]!;
    const q = buildQueuedAction(action, "vex", 7);
    expect(q.kind).toBe("giftEmpire");
    expect(q.targetId).toBe("vex");
    expect(q.surveilLens).toBeUndefined();
    expect(q.id).toContain("7"); // includes turn
  });

  it("constructs surveil action with lens", () => {
    const action = getActionsForRival(rival).find(
      (a) => a.surveilLens === "cash",
    )!;
    const q = buildQueuedAction(action, "chen", 7);
    expect(q.kind).toBe("surveil");
    expect(q.surveilLens).toBe("cash");
  });
});
