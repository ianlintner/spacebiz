import { describe, it, expect } from "vitest";
import {
  generateBorderPorts,
  updateBorderPorts,
  getRelationStatus,
} from "../EmpireBorderManager.ts";
import type {
  Hyperlane,
  StarSystem,
  DiplomaticRelation,
} from "../../../data/types.ts";

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

function makeRelation(
  empireA: string,
  empireB: string,
  status: DiplomaticRelation["status"],
): DiplomaticRelation {
  return { empireA, empireB, status, turnsInCurrentStatus: 0 };
}

describe("EmpireBorderManager", () => {
  const systems: StarSystem[] = [
    makeSystem("s1", "empire-1"),
    makeSystem("s2", "empire-1"),
    makeSystem("s3", "empire-2"),
    makeSystem("s4", "empire-2"),
  ];

  // s1(e1) - s3(e2) : cross-empire
  // s1(e1) - s2(e1) : same-empire
  // s3(e2) - s4(e2) : same-empire
  const hyperlanes: Hyperlane[] = [
    makeHyperlane("h1", "s1", "s3", 5),
    makeHyperlane("h2", "s1", "s2", 3),
    makeHyperlane("h3", "s3", "s4", 4),
  ];

  describe("generateBorderPorts", () => {
    it("creates ports only for cross-empire hyperlanes", () => {
      const relations = [makeRelation("empire-1", "empire-2", "peace")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);

      // Only h1 crosses empires, so 2 ports (one per side)
      expect(ports).toHaveLength(2);
      expect(ports[0].hyperlaneId).toBe("h1");
      expect(ports[1].hyperlaneId).toBe("h1");
      expect(ports.map((p) => p.empireId).sort()).toEqual([
        "empire-1",
        "empire-2",
      ]);
    });

    it("sets port status based on diplomatic relation", () => {
      const relations = [makeRelation("empire-1", "empire-2", "war")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);
      expect(ports.every((p) => p.status === "closed")).toBe(true);
    });

    it("opens all ports for alliance status", () => {
      const relations = [makeRelation("empire-1", "empire-2", "alliance")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);
      expect(ports.every((p) => p.status === "open")).toBe(true);
    });

    it("opens all ports for tradePact status", () => {
      const relations = [makeRelation("empire-1", "empire-2", "tradePact")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);
      expect(ports.every((p) => p.status === "open")).toBe(true);
    });

    it("uses restricted status for peace", () => {
      const relations = [makeRelation("empire-1", "empire-2", "peace")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);
      expect(ports.every((p) => p.status === "restricted")).toBe(true);
    });
  });

  describe("updateBorderPorts", () => {
    it("updates port statuses when relations change", () => {
      const relations = [makeRelation("empire-1", "empire-2", "peace")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);
      expect(ports.every((p) => p.status === "restricted")).toBe(true);

      // Change to war
      relations[0].status = "war";
      const updated = updateBorderPorts(ports, systems, relations);
      expect(updated.every((p) => p.status === "closed")).toBe(true);
    });

    it("opens ports when relations improve to alliance", () => {
      const relations = [makeRelation("empire-1", "empire-2", "coldWar")];
      const ports = generateBorderPorts(hyperlanes, systems, relations);
      expect(ports.every((p) => p.status === "closed")).toBe(true);

      relations[0].status = "alliance";
      const updated = updateBorderPorts(ports, systems, relations);
      expect(updated.every((p) => p.status === "open")).toBe(true);
    });
  });

  describe("getRelationStatus", () => {
    it("returns the status of an existing relation", () => {
      const relations = [makeRelation("empire-1", "empire-2", "tradePact")];
      expect(getRelationStatus("empire-1", "empire-2", relations)).toBe(
        "tradePact",
      );
    });

    it("works regardless of empire order", () => {
      const relations = [makeRelation("empire-1", "empire-2", "alliance")];
      expect(getRelationStatus("empire-2", "empire-1", relations)).toBe(
        "alliance",
      );
    });

    it("defaults to peace if no relation exists", () => {
      expect(getRelationStatus("empire-1", "empire-99", [])).toBe("peace");
    });
  });
});
