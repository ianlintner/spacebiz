import { describe, it, expect } from "vitest";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { seedUniverseRoster, rosterTick } from "../universeRoster.ts";

const fakeGalaxy = {
  planets: [
    { name: "Kepler-4" },
    { name: "Veylor Prime" },
    { name: "Brittain-9" },
    { name: "Aurora Reach" },
    { name: "Sigma Drift" },
    { name: "Halcyon Hub" },
    { name: "Marrow Belt" },
    { name: "Quasar Verge" },
  ],
} as const;

describe("seedUniverseRoster", () => {
  it("produces a roster with the expected entity counts", () => {
    const roster = seedUniverseRoster(new SeededRNG(42), fakeGalaxy as never);
    expect(roster.sportsTeams).toHaveLength(8);
    expect(roster.musicians).toHaveLength(6);
    expect(roster.celebrities).toHaveLength(6);
    expect(roster.pundits).toHaveLength(4);
    expect(roster.crimeFigures).toHaveLength(3);
    expect(roster.militaryOfficers).toHaveLength(4);
  });

  it("is deterministic for the same seed", () => {
    const a = seedUniverseRoster(new SeededRNG(99), fakeGalaxy as never);
    const b = seedUniverseRoster(new SeededRNG(99), fakeGalaxy as never);
    expect(a.sportsTeams[0].name).toBe(b.sportsTeams[0].name);
    expect(a.musicians[0].name).toBe(b.musicians[0].name);
  });

  it("binds sports teams to real ports from galaxy state", () => {
    const roster = seedUniverseRoster(new SeededRNG(7), fakeGalaxy as never);
    const planetNames = fakeGalaxy.planets.map((p) => p.name);
    for (const team of roster.sportsTeams) {
      expect(planetNames).toContain(team.homePort);
    }
  });

  it("starts all sports teams at 0-0 with no streak", () => {
    const roster = seedUniverseRoster(new SeededRNG(7), fakeGalaxy as never);
    for (const team of roster.sportsTeams) {
      expect(team.wins).toBe(0);
      expect(team.losses).toBe(0);
      expect(team.streak).toBe(0);
      expect(team.championship).toBe(false);
    }
  });
});

describe("rosterTick", () => {
  it("plays one match per pair of teams and updates standings", () => {
    const roster = seedUniverseRoster(new SeededRNG(11), fakeGalaxy as never);
    const history = rosterTick(roster, new SeededRNG(11), 1);

    const totalGames = roster.sportsTeams.reduce(
      (sum, t) => sum + t.wins + t.losses,
      0,
    );
    // 8 teams paired into 4 matches; each match adds 1 win + 1 loss = 2 game-rows
    expect(totalGames).toBe(8);

    // Should produce at least 4 sports history entries (one per match)
    expect(
      history.filter((h) => h.event.includes("defeated")).length,
    ).toBeGreaterThanOrEqual(4);
  });

  it("flips musician onTour state across turns", () => {
    const roster = seedUniverseRoster(new SeededRNG(33), fakeGalaxy as never);
    const initial = roster.musicians.map((m) => m.onTour);
    // tick several turns to give state a chance to flip
    for (let t = 1; t <= 10; t++) {
      rosterTick(roster, new SeededRNG(33 + t), t);
    }
    const after = roster.musicians.map((m) => m.onTour);
    expect(initial).not.toEqual(after);
  });
});
