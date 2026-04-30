import { describe, it, expect } from "vitest";
import { generateAmbassadors } from "../AmbassadorGenerator.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { Empire, AICompany } from "../../../data/types.ts";

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

describe("AmbassadorGenerator", () => {
  it("generates one ambassador per empire and one liaison per rival", () => {
    const rng = new SeededRNG(123);
    const out = generateAmbassadors(rng, [empire], [rival]);
    expect(Object.keys(out.empireAmbassadors)).toEqual(["vex"]);
    expect(Object.keys(out.rivalLiaisons)).toEqual(["chen"]);
  });

  it("ambassadors have name, portrait, personality", () => {
    const rng = new SeededRNG(123);
    const out = generateAmbassadors(rng, [empire], [rival]);
    const amb = out.empireAmbassadors["vex"]!;
    expect(typeof amb.name).toBe("string");
    expect(amb.name.length).toBeGreaterThan(0);
    expect(amb.portrait.portraitId).toBeDefined();
    expect(["formal", "mercenary", "suspicious", "warm"]).toContain(
      amb.personality,
    );
  });

  it("is deterministic for the same seed", () => {
    const a = generateAmbassadors(new SeededRNG(42), [empire], [rival]);
    const b = generateAmbassadors(new SeededRNG(42), [empire], [rival]);
    expect(a).toEqual(b);
  });

  it("inherits portrait category from the source faction", () => {
    const rng = new SeededRNG(123);
    const out = generateAmbassadors(rng, [empire], [rival]);
    // empire is "alien" → ambassador is alien
    expect(out.empireAmbassadors["vex"]!.portrait.category).toBe("alien");
    // rival CEO is "human" → liaison is human
    expect(out.rivalLiaisons["chen"]!.portrait.category).toBe("human");
  });
});
