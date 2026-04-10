import { describe, it, expect } from "vitest";
import {
  initializeDiplomacy,
  setDiplomaticStatus,
  getRelation,
} from "../DiplomacyManager.ts";
import type { Empire, Hyperlane, StarSystem } from "../../../data/types.ts";

function makeEmpire(id: string, homeSystemId: string): Empire {
  return {
    id,
    name: `Empire ${id}`,
    homeSystemId,
    color: 0xffffff,
    tariffRate: 0.1,
    disposition: "neutral",
    leaderName: `Leader ${id}`,
    leaderPortrait: { portraitId: "leader-01", category: "human" },
  };
}

function makeSystem(id: string, empireId: string): StarSystem {
  return {
    id,
    name: `System ${id}`,
    sectorId: "sector-1",
    empireId,
    x: 0,
    y: 0,
    starColor: 0xffffff,
  };
}

function makeHyperlane(
  id: string,
  systemA: string,
  systemB: string,
  distance: number,
): Hyperlane {
  return { id, systemA, systemB, distance };
}

describe("DiplomacyManager", () => {
  const empires: Empire[] = [
    makeEmpire("e1", "s1"),
    makeEmpire("e2", "s2"),
    makeEmpire("e3", "s3"),
  ];

  const systems: StarSystem[] = [
    makeSystem("s1", "e1"),
    makeSystem("s2", "e2"),
    makeSystem("s3", "e3"),
  ];

  // e1-e2 are adjacent via hyperlane, e3 is not connected
  const hyperlanes: Hyperlane[] = [makeHyperlane("h1", "s1", "s2", 5)];

  describe("initializeDiplomacy", () => {
    it("creates relations for all empire pairs", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      // 3 empires → 3 pairs: e1-e2, e1-e3, e2-e3
      expect(relations).toHaveLength(3);
    });

    it("sets adjacent empires to peace", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      const e1e2 = getRelation("e1", "e2", relations);
      expect(e1e2).not.toBeNull();
      expect(e1e2!.status).toBe("peace");
    });

    it("sets non-adjacent empires to coldWar", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      const e1e3 = getRelation("e1", "e3", relations);
      expect(e1e3).not.toBeNull();
      expect(e1e3!.status).toBe("coldWar");
    });

    it("initializes turnsInCurrentStatus to 0", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      for (const rel of relations) {
        expect(rel.turnsInCurrentStatus).toBe(0);
      }
    });
  });

  describe("setDiplomaticStatus", () => {
    it("updates existing relation status", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      setDiplomaticStatus("e1", "e2", "war", relations);
      const rel = getRelation("e1", "e2", relations);
      expect(rel!.status).toBe("war");
      expect(rel!.turnsInCurrentStatus).toBe(0);
    });

    it("works regardless of empire order", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      setDiplomaticStatus("e2", "e1", "alliance", relations);
      const rel = getRelation("e1", "e2", relations);
      expect(rel!.status).toBe("alliance");
    });

    it("creates a new relation if none exists", () => {
      const relations: ReturnType<typeof initializeDiplomacy> = [];
      setDiplomaticStatus("eX", "eY", "tradePact", relations);
      expect(relations).toHaveLength(1);
      expect(relations[0].status).toBe("tradePact");
    });
  });

  describe("getRelation", () => {
    it("returns null for non-existent relation", () => {
      expect(getRelation("e1", "e99", [])).toBeNull();
    });

    it("finds relation regardless of order", () => {
      const relations = initializeDiplomacy(empires, systems, hyperlanes);
      const fwd = getRelation("e1", "e2", relations);
      const rev = getRelation("e2", "e1", relations);
      expect(fwd).not.toBeNull();
      expect(rev).not.toBeNull();
      expect(fwd).toEqual(rev);
    });
  });
});
