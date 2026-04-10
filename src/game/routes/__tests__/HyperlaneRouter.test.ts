import { describe, it, expect } from "vitest";
import {
  findPath,
  getReachableSystems,
  calculateHyperlaneDistance,
  countBorderCrossings,
  getSystemHyperlanes,
  getHyperlaneNeighbors,
} from "../HyperlaneRouter.ts";
import type {
  Hyperlane,
  BorderPort,
  StarSystem,
  Planet,
} from "../../../data/types.ts";

// ── Test helpers ──────────────────────────────────────────────────────

function makeHyperlane(
  id: string,
  systemA: string,
  systemB: string,
  distance: number,
): Hyperlane {
  return { id, systemA, systemB, distance };
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

function makePlanet(
  id: string,
  systemId: string,
  x: number,
  y: number,
): Planet {
  return {
    id,
    name: `Planet ${id}`,
    systemId,
    type: "terran",
    x,
    y,
    population: 1000,
  };
}

function makePort(
  empireId: string,
  hyperlaneId: string,
  systemId: string,
  status: "open" | "closed" | "restricted",
): BorderPort {
  return {
    id: `bp-${empireId}-${hyperlaneId}`,
    empireId,
    hyperlaneId,
    systemId,
    status,
  };
}

// ── Graph fixture ─────────────────────────────────────────────────────
//
//   A --5-- B --3-- C
//    \              |
//     10            2
//      \            |
//       D ---4--- E
//
const hyperlanes: Hyperlane[] = [
  makeHyperlane("h1", "A", "B", 5),
  makeHyperlane("h2", "B", "C", 3),
  makeHyperlane("h3", "A", "D", 10),
  makeHyperlane("h4", "C", "E", 2),
  makeHyperlane("h5", "D", "E", 4),
];

// ── Tests ─────────────────────────────────────────────────────────────

describe("HyperlaneRouter", () => {
  describe("findPath", () => {
    it("finds the shortest path between two systems", () => {
      const path = findPath("A", "E", hyperlanes, []);
      expect(path).not.toBeNull();
      expect(path!.systems).toEqual(["A", "B", "C", "E"]);
      expect(path!.totalDistance).toBe(10); // 5 + 3 + 2
    });

    it("returns null for same origin and destination with zero distance", () => {
      const path = findPath("A", "A", hyperlanes, []);
      expect(path).not.toBeNull();
      expect(path!.totalDistance).toBe(0);
      expect(path!.systems).toEqual(["A"]);
    });

    it("returns null when no path exists due to closed border port", () => {
      // Close the only connection from B to C and also A-D link
      const ports: BorderPort[] = [
        makePort("e1", "h2", "B", "closed"),
        makePort("e2", "h3", "A", "closed"),
        makePort("e2", "h4", "C", "closed"),
        makePort("e2", "h5", "D", "closed"),
      ];
      const path = findPath("A", "E", hyperlanes, ports);
      expect(path).toBeNull();
    });

    it("avoids closed hyperlane and takes alternate route", () => {
      // Close h2 (B-C), so path must go A-D-E
      const ports: BorderPort[] = [makePort("e1", "h2", "B", "closed")];
      const path = findPath("A", "E", hyperlanes, ports);
      expect(path).not.toBeNull();
      expect(path!.systems).toEqual(["A", "D", "E"]);
      expect(path!.totalDistance).toBe(14); // 10 + 4
    });

    it("ignores open and restricted ports (does not block)", () => {
      const ports: BorderPort[] = [
        makePort("e1", "h1", "A", "open"),
        makePort("e2", "h2", "B", "restricted"),
      ];
      const path = findPath("A", "C", hyperlanes, ports);
      expect(path).not.toBeNull();
      expect(path!.systems).toEqual(["A", "B", "C"]);
    });

    it("returns null for unreachable system", () => {
      // Isolated graph: only {A, B}
      const small = [makeHyperlane("h1", "A", "B", 5)];
      const path = findPath("A", "C", small, []);
      expect(path).toBeNull();
    });
  });

  describe("getReachableSystems", () => {
    it("returns all connected systems with no border ports", () => {
      const reachable = getReachableSystems("A", hyperlanes, []);
      expect(reachable).toEqual(new Set(["A", "B", "C", "D", "E"]));
    });

    it("limits reachability when a border port is closed", () => {
      // Close h3 (A-D) and h2 (B-C)
      const ports: BorderPort[] = [
        makePort("e1", "h3", "A", "closed"),
        makePort("e2", "h2", "B", "closed"),
      ];
      const reachable = getReachableSystems("A", hyperlanes, ports);
      expect(reachable).toEqual(new Set(["A", "B"]));
    });
  });

  describe("calculateHyperlaneDistance", () => {
    const systems: StarSystem[] = [
      makeSystem("s1", "empire-1"),
      makeSystem("s2", "empire-2"),
    ];

    it("returns Euclidean distance for same-system planets", () => {
      const p1 = makePlanet("p1", "s1", 0, 0);
      const p2 = makePlanet("p2", "s1", 3, 4);
      const dist = calculateHyperlaneDistance(p1, p2, systems, [], []);
      expect(dist).toBeCloseTo(5);
    });

    it("returns hyperlane path distance for cross-system planets", () => {
      const p1 = makePlanet("p1", "A", 0, 0);
      const p2 = makePlanet("p2", "C", 10, 10);
      const dist = calculateHyperlaneDistance(p1, p2, [], hyperlanes, []);
      expect(dist).toBe(8); // A->B->C = 5+3
    });

    it("returns -1 for unreachable planets", () => {
      const isolated = [makeHyperlane("h1", "A", "B", 5)];
      const p1 = makePlanet("p1", "A", 0, 0);
      const p2 = makePlanet("p2", "X", 10, 10);
      const dist = calculateHyperlaneDistance(p1, p2, [], isolated, []);
      expect(dist).toBe(-1);
    });
  });

  describe("countBorderCrossings", () => {
    it("counts hyperlanes crossing empire boundaries", () => {
      const systems: StarSystem[] = [
        makeSystem("A", "empire-1"),
        makeSystem("B", "empire-1"),
        makeSystem("C", "empire-2"),
        makeSystem("D", "empire-2"),
        makeSystem("E", "empire-3"),
      ];

      const path = findPath("A", "E", hyperlanes, [])!;
      expect(path).not.toBeNull();
      // A(e1)->B(e1)->C(e2)->E(e3) : B->C crosses, C->E crosses = 2
      const crossings = countBorderCrossings(path, systems);
      expect(crossings).toBe(2);
    });

    it("returns 0 when all systems are same empire", () => {
      const systems: StarSystem[] = [
        makeSystem("A", "empire-1"),
        makeSystem("B", "empire-1"),
        makeSystem("C", "empire-1"),
      ];

      const path = findPath("A", "C", hyperlanes, [])!;
      const crossings = countBorderCrossings(path, systems);
      expect(crossings).toBe(0);
    });
  });

  describe("getSystemHyperlanes", () => {
    it("returns all hyperlanes connected to a system", () => {
      const result = getSystemHyperlanes("A", hyperlanes);
      expect(result).toHaveLength(2);
      expect(result.map((h) => h.id).sort()).toEqual(["h1", "h3"]);
    });

    it("returns empty for system with no connections", () => {
      const result = getSystemHyperlanes("Z", hyperlanes);
      expect(result).toHaveLength(0);
    });
  });

  describe("getHyperlaneNeighbors", () => {
    it("returns neighbor system ids", () => {
      const neighbors = getHyperlaneNeighbors("B", hyperlanes);
      expect(neighbors.sort()).toEqual(["A", "C"]);
    });

    it("returns empty for isolated system", () => {
      const neighbors = getHyperlaneNeighbors("Z", hyperlanes);
      expect(neighbors).toHaveLength(0);
    });
  });
});
