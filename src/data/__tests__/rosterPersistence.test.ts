import { describe, it, expect } from "vitest";
import { seedUniverseRoster } from "../../generation/news/universeRoster.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import type { RosterHistoryEntry } from "../types.ts";

describe("UniverseRoster JSON round-trip", () => {
  it("survives JSON.stringify/parse without losing fields", () => {
    const fakeGalaxy = {
      planets: [
        { name: "Kepler-4" },
        { name: "Veylor Prime" },
        { name: "Halcyon" },
      ],
    };
    const roster = seedUniverseRoster(new SeededRNG(7), fakeGalaxy as never);
    const round = JSON.parse(JSON.stringify(roster));
    expect(round.sportsTeams).toHaveLength(8);
    expect(round.sportsTeams[0].name).toBe(roster.sportsTeams[0].name);
    expect(round.musicians[0].genre).toBe(roster.musicians[0].genre);
  });

  it("rosterHistory entries survive JSON.stringify/parse", () => {
    const history: RosterHistoryEntry[] = [
      {
        turn: 12,
        entityId: "musician-7",
        event: "Drops a chart-topping single",
      },
    ];
    const round: RosterHistoryEntry[] = JSON.parse(JSON.stringify(history));
    expect(round).toHaveLength(1);
    expect(round[0].turn).toBe(12);
    expect(round[0].entityId).toBe("musician-7");
    expect(round[0].event).toBe("Drops a chart-topping single");
  });
});
