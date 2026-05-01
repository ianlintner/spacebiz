import { describe, it, expect } from "vitest";
import {
  computeGiftCostForEmpire,
  getActionsForEmpire,
  getActionsForRival,
  getSubjectCandidates,
  evaluateActionState,
  buildQueuedAction,
  getPerTurnCap,
  getActiveTagBadges,
  getTierColorName,
  describeTag,
  describeActionEffect,
  detectTierShifts,
  snapshotTiers,
  getAmbientGreeting,
  type HubActionDescriptor,
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
  it("returns gift + lobbyFor + lobbyAgainst", () => {
    const actions = getActionsForEmpire(empire, makeState({ systems: 2 }));
    expect(actions.map((a) => a.kind)).toEqual([
      "giftEmpire",
      "lobbyFor",
      "lobbyAgainst",
    ]);
    expect(actions[0]!.cashCost).toBe(8_000);
  });

  it("marks gift as single-category and lobby as subject-category", () => {
    const actions = getActionsForEmpire(empire, makeState({ systems: 0 }));
    expect(actions[0]!.category).toBe("single");
    expect(actions[1]!.category).toBe("subject");
    expect(actions[2]!.category).toBe("subject");
  });

  it("lobby actions carry a subjectPrompt referencing the empire", () => {
    const actions = getActionsForEmpire(empire, makeState({ systems: 0 }));
    expect(actions[1]!.subjectPrompt).toContain("Vex Hegemony");
    expect(actions[2]!.subjectPrompt).toContain("Vex Hegemony");
  });
});

describe("getActionsForRival", () => {
  it("returns gift + three surveil lenses + propose-non-compete + sabotage", () => {
    const actions = getActionsForRival(rival);
    expect(actions.map((a) => a.kind)).toEqual([
      "giftRival",
      "surveil",
      "surveil",
      "surveil",
      "proposeNonCompete",
      "sabotage",
    ]);
    expect(actions.map((a) => a.surveilLens)).toEqual([
      undefined,
      "cash",
      "topContractByValue",
      "topEmpireStanding",
      undefined,
      undefined,
    ]);
  });

  it("non-compete is pair-category with subjectPrompt", () => {
    const actions = getActionsForRival(rival);
    const nc = actions.find((a) => a.kind === "proposeNonCompete")!;
    expect(nc.category).toBe("pair");
    expect(nc.subjectPrompt).toContain("Chen Logistics");
  });

  it("sabotage is single-category with 30k cost", () => {
    const actions = getActionsForRival(rival);
    const sabo = actions.find((a) => a.kind === "sabotage")!;
    expect(sabo.category).toBe("single");
    expect(sabo.cashCost).toBe(30_000);
    expect(sabo.subjectPrompt).toBeUndefined();
  });
});

describe("getSubjectCandidates", () => {
  it("returns rivals for lobbyFor", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 })).find(
      (a) => a.kind === "lobbyFor",
    )!;
    const cands = getSubjectCandidates(action, makeState());
    expect(cands).toEqual([{ id: "chen", name: "Chen Logistics" }]);
  });

  it("excludes bankrupt rivals from lobby candidates", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 })).find(
      (a) => a.kind === "lobbyFor",
    )!;
    const s = makeState();
    s.aiCompanies = [{ ...rival, bankrupt: true }];
    const cands = getSubjectCandidates(action, s);
    expect(cands).toEqual([]);
  });

  it("returns all non-player empires for proposeNonCompete", () => {
    const action = getActionsForRival(rival).find(
      (a) => a.kind === "proposeNonCompete",
    )!;
    const s = makeState();
    s.galaxy = {
      ...s.galaxy,
      empires: [
        empire,
        { ...empire, id: "sol", name: "Sol Federation" },
        { ...empire, id: "kade", name: "Kade Reach" },
      ],
    };
    s.playerEmpireId = "sol";
    const cands = getSubjectCandidates(action, s);
    expect(cands.map((c) => c.id)).toEqual(["vex", "kade"]);
  });

  it("returns empty for single-category actions", () => {
    const giftAction = getActionsForEmpire(
      empire,
      makeState({ systems: 0 }),
    )[0]!;
    expect(getSubjectCandidates(giftAction, makeState())).toEqual([]);
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

  it("constructs lobby action with single subjectId", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 })).find(
      (a) => a.kind === "lobbyFor",
    )!;
    const q = buildQueuedAction(action, "vex", 7, { subjectId: "chen" });
    expect(q.kind).toBe("lobbyFor");
    expect(q.targetId).toBe("vex");
    expect(q.subjectId).toBe("chen");
    expect(q.subjectIdSecondary).toBeUndefined();
  });

  it("constructs non-compete with two subject ids", () => {
    const action = getActionsForRival(rival).find(
      (a) => a.kind === "proposeNonCompete",
    )!;
    const q = buildQueuedAction(action, "chen", 7, {
      subjectId: "vex",
      subjectIdSecondary: "sol",
    });
    expect(q.kind).toBe("proposeNonCompete");
    expect(q.subjectId).toBe("vex");
    expect(q.subjectIdSecondary).toBe("sol");
  });
});

describe("getActiveTagBadges", () => {
  it("filters out expired tags", () => {
    const badges = getActiveTagBadges(
      [
        { kind: "OweFavor", expiresOnTurn: 5 },
        { kind: "RecentlyGifted", expiresOnTurn: 10 },
      ],
      5, // currentTurn — OweFavor expires at 5, so should drop
    );
    expect(badges.map((b) => b.label)).toEqual(["Gifted"]);
  });

  it("returns empty array when all tags expired", () => {
    expect(
      getActiveTagBadges([{ kind: "OweFavor", expiresOnTurn: 1 }], 5),
    ).toEqual([]);
  });

  it("describes each tag kind with intent", () => {
    expect(describeTag({ kind: "OweFavor", expiresOnTurn: 99 }).intent).toBe(
      "good",
    );
    expect(
      describeTag({ kind: "RecentlyGifted", expiresOnTurn: 99 }).intent,
    ).toBe("neutral");
    expect(
      describeTag({
        kind: "SuspectedSpy",
        suspectId: "player",
        expiresOnTurn: 99,
      }).intent,
    ).toBe("bad");
    expect(
      describeTag({
        kind: "NonCompete",
        protectedEmpireIds: ["vex", "sol"],
        expiresOnTurn: 99,
      }).intent,
    ).toBe("neutral");
    expect(
      describeTag({
        kind: "LeakedIntel",
        lens: "cash",
        value: "1000",
        expiresOnTurn: 99,
      }).intent,
    ).toBe("good");
    const sabo = describeTag({ kind: "Sabotaged", expiresOnTurn: 99 });
    expect(sabo.intent).toBe("good");
    expect(sabo.label).toBe("Sabotaged");
    expect(sabo.tooltip.length).toBeGreaterThan(0);
  });

  it("non-compete tooltip lists protected empires", () => {
    const t = describeTag({
      kind: "NonCompete",
      protectedEmpireIds: ["vex", "sol"],
      expiresOnTurn: 99,
    });
    expect(t.tooltip).toContain("vex");
    expect(t.tooltip).toContain("sol");
  });
});

describe("getTierColorName", () => {
  it("maps each tier to a stable color-name", () => {
    expect(getTierColorName("Hostile")).toBe("danger");
    expect(getTierColorName("Cold")).toBe("warning");
    expect(getTierColorName("Neutral")).toBe("muted");
    expect(getTierColorName("Warm")).toBe("accent");
    expect(getTierColorName("Allied")).toBe("highlight");
  });
});

describe("evaluateActionState — affordance hints", () => {
  it("surfaces +15% favor on lobby when target empire has OweFavor", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 })).find(
      (a) => a.kind === "lobbyFor",
    )!;
    const s = makeState();
    s.diplomacy = {
      ...s.diplomacy!,
      empireTags: { vex: [{ kind: "OweFavor", expiresOnTurn: 99 }] },
    };
    const r = evaluateActionState(action, "vex", s);
    expect(r.enabled).toBe(true);
    expect(r.affordanceHint).toBe("+15% favor");
  });

  it("surfaces -50% dampener on giftEmpire when ANY empire has RecentlyGifted", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 }))[0]!;
    const s = makeState();
    s.diplomacy = {
      ...s.diplomacy!,
      empireTags: {
        sol: [{ kind: "RecentlyGifted", expiresOnTurn: 99 }],
      },
    };
    const r = evaluateActionState(action, "vex", s);
    expect(r.enabled).toBe(true);
    expect(r.affordanceHint).toBe("-50% dampener");
  });

  it("no hint on a fresh empire/rival", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 }))[0]!;
    const r = evaluateActionState(action, "vex", makeState());
    expect(r.enabled).toBe(true);
    expect(r.affordanceHint).toBeUndefined();
  });

  it("no hint surfaced on disabled actions (cap-blocked stays cap-blocked)", () => {
    const action = getActionsForEmpire(empire, makeState({ systems: 0 })).find(
      (a) => a.kind === "lobbyFor",
    )!;
    const s = makeState({ queuedCount: 2 });
    s.diplomacy = {
      ...s.diplomacy!,
      queuedActions: [
        { id: "x", kind: "giftEmpire", targetId: "vex", cashCost: 0 },
        { id: "y", kind: "giftEmpire", targetId: "sol", cashCost: 0 },
      ],
      empireTags: { vex: [{ kind: "OweFavor", expiresOnTurn: 99 }] },
    };
    const r = evaluateActionState(action, "vex", s);
    expect(r.enabled).toBe(false);
    expect(r.reasonIfDisabled).toBe("cap");
    expect(r.affordanceHint).toBeUndefined();
  });
});

describe("detectTierShifts", () => {
  it("returns empty array when nothing changed", () => {
    expect(
      detectTierShifts(
        { vex: "Neutral", sol: "Cold" },
        { vex: "Neutral", sol: "Cold" },
      ),
    ).toEqual([]);
  });

  it("flags upward shift", () => {
    const shifts = detectTierShifts({ vex: "Neutral" }, { vex: "Warm" });
    expect(shifts).toEqual([
      { id: "vex", from: "Neutral", to: "Warm", direction: "up" },
    ]);
  });

  it("flags downward shift", () => {
    const shifts = detectTierShifts({ vex: "Warm" }, { vex: "Cold" });
    expect(shifts).toEqual([
      { id: "vex", from: "Warm", to: "Cold", direction: "down" },
    ]);
  });

  it("flags multiple targets in one diff", () => {
    const shifts = detectTierShifts(
      { vex: "Hostile", sol: "Neutral" },
      { vex: "Cold", sol: "Hostile" },
    );
    expect(shifts).toHaveLength(2);
    expect(shifts.find((s) => s.id === "vex")?.direction).toBe("up");
    expect(shifts.find((s) => s.id === "sol")?.direction).toBe("down");
  });

  it("ignores ids missing from prev (newly added targets)", () => {
    const shifts = detectTierShifts({}, { vex: "Allied" });
    expect(shifts).toEqual([]);
  });

  it("ignores ids missing from current (removed targets)", () => {
    const shifts = detectTierShifts({ vex: "Allied" }, {});
    expect(shifts).toEqual([]);
  });
});

describe("snapshotTiers", () => {
  it("captures empire and rival tiers from the active state", () => {
    const s = makeState();
    s.empireReputation = { vex: 70, sol: 25 };
    s.diplomacy = {
      ...s.diplomacy!,
      rivalStanding: { chen: 50, kade: 85 },
    };
    expect(snapshotTiers(s)).toEqual({
      vex: "Warm",
      sol: "Cold",
      chen: "Neutral",
      kade: "Allied",
    });
  });

  it("treats missing fields as empty (no tiers)", () => {
    const s = {
      seed: 1,
      turn: 1,
      galaxy: { empires: [], systems: [] },
      aiCompanies: [],
    } as unknown as GameState;
    expect(snapshotTiers(s)).toEqual({});
  });
});

describe("getAmbientGreeting", () => {
  it("returns a non-empty string for every (personality, tier) pair", () => {
    const personalities = [
      "formal",
      "mercenary",
      "suspicious",
      "warm",
    ] as const;
    const tiers = ["Hostile", "Cold", "Neutral", "Warm", "Allied"] as const;
    for (const p of personalities) {
      for (const t of tiers) {
        const line = getAmbientGreeting(p, t);
        expect(typeof line).toBe("string");
        expect(line.length).toBeGreaterThan(5);
      }
    }
  });

  it("varies across personalities for the same tier", () => {
    const formal = getAmbientGreeting("formal", "Neutral");
    const mercenary = getAmbientGreeting("mercenary", "Neutral");
    const warm = getAmbientGreeting("warm", "Neutral");
    expect(new Set([formal, mercenary, warm]).size).toBe(3);
  });

  it("varies across tiers for the same personality", () => {
    const hostile = getAmbientGreeting("warm", "Hostile");
    const allied = getAmbientGreeting("warm", "Allied");
    expect(hostile).not.toBe(allied);
  });
});

describe("describeActionEffect", () => {
  const baseAction = (
    overrides: Partial<HubActionDescriptor>,
  ): HubActionDescriptor => ({
    id: "x",
    kind: "giftEmpire",
    label: "Send Gift",
    cashCost: 10_000,
    category: "single",
    ...overrides,
  });

  it("describes giftEmpire", () => {
    const s = describeActionEffect(baseAction({ kind: "giftEmpire" }));
    expect(s).toMatch(/empire/i);
  });

  it("describes giftRival", () => {
    const s = describeActionEffect(baseAction({ kind: "giftRival" }));
    expect(s).toMatch(/rival/i);
  });

  it("describes surveil with each lens", () => {
    const cash = describeActionEffect(
      baseAction({ kind: "surveil", surveilLens: "cash" }),
    );
    const top = describeActionEffect(
      baseAction({ kind: "surveil", surveilLens: "topContractByValue" }),
    );
    const standing = describeActionEffect(
      baseAction({ kind: "surveil", surveilLens: "topEmpireStanding" }),
    );
    expect(cash).toMatch(/cash/i);
    expect(top).toMatch(/contract/i);
    expect(standing).toMatch(/empire|favor/i);
  });

  it("falls back to a generic surveil description when lens is missing", () => {
    const s = describeActionEffect(baseAction({ kind: "surveil" }));
    expect(s).toMatch(/intelligence|gather/i);
  });

  it("describes sabotage", () => {
    const s = describeActionEffect(baseAction({ kind: "sabotage" }));
    expect(s).toMatch(/sabotage|disrupt|risk/i);
  });

  it("returns null for non-single-category kinds", () => {
    expect(describeActionEffect(baseAction({ kind: "lobbyFor" }))).toBeNull();
    expect(
      describeActionEffect(baseAction({ kind: "lobbyAgainst" })),
    ).toBeNull();
    expect(
      describeActionEffect(baseAction({ kind: "proposeNonCompete" })),
    ).toBeNull();
  });
});
