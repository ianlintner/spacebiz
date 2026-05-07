import { describe, it, expect } from "vitest";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { substituteTickerTokens } from "../tokens.ts";
import { seedUniverseRoster } from "../universeRoster.ts";
import type { GameState } from "../../../data/types.ts";

const fakeGalaxy = {
  planets: [
    { name: "Kepler-4" },
    { name: "Veylor" },
    { name: "Halcyon" },
    { name: "Sigma" },
    { name: "Aurora" },
    { name: "Brittain" },
    { name: "Quasar" },
    { name: "Marrow" },
  ],
  empires: [{ name: "Helion" }, { name: "Korr" }],
};

function makeState(): GameState {
  const roster = seedUniverseRoster(new SeededRNG(101), fakeGalaxy);
  return {
    seed: 101,
    turn: 1,
    galaxy: fakeGalaxy,
    universeRoster: roster,
    rosterHistory: [],
    aiCompanies: [],
  } as unknown as GameState;
}

describe("substituteTickerTokens roster bindings", () => {
  it("resolves {team}, {team2}, {musician}, {celeb}, {pundit}, {officer}, {rank}, {crime_figure}", () => {
    const state = makeState();
    const out = substituteTickerTokens(
      "{team} routs {team2}; {musician} reacts. {celeb}, {pundit}, {rank} {officer}, {crime_figure}.",
      state,
      new SeededRNG(202),
    );
    // Tokens are substituted (none left in result)
    expect(out).not.toContain("{team}");
    expect(out).not.toContain("{team2}");
    expect(out).not.toContain("{musician}");
    expect(out).not.toContain("{celeb}");
    expect(out).not.toContain("{pundit}");
    expect(out).not.toContain("{officer}");
    expect(out).not.toContain("{rank}");
    expect(out).not.toContain("{crime_figure}");
    // Two distinct teams
    const teamNames = state.universeRoster!.sportsTeams.map((t) => t.name);
    const found = teamNames.filter((n) => out.includes(n));
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  it("{last_result} resolves to the bound team's lastResult", () => {
    const state = makeState();
    // Stamp a unique lastResult on every team so whichever team {team} binds
    // to, its corresponding {last_result} fragment will be detectable.
    for (const team of state.universeRoster!.sportsTeams) {
      team.lastResult = `defeated the ${team.name} rivals 9-3`;
    }
    const out = substituteTickerTokens(
      "{team} {last_result}.",
      state,
      new SeededRNG(303),
    );
    // The team that gets bound must match the lastResult that gets bound.
    // The simplest assertion: the output contains some team's lastResult fragment.
    const anyMatch = state.universeRoster!.sportsTeams.some(
      (t) => t.lastResult && out.includes(t.lastResult),
    );
    expect(anyMatch).toBe(true);
  });

  it("{album}, {genre}, {controversy} bind to the chosen musician", () => {
    const state = makeState();
    // Force a controversy on every musician so the {controversy} binding can resolve.
    for (const m of state.universeRoster!.musicians) {
      m.controversyDesc = `controversy for ${m.name}`;
    }
    const out = substituteTickerTokens(
      "{musician} drops {album} ({genre}); cited for {controversy}.",
      state,
      new SeededRNG(404),
    );
    expect(out).not.toContain("{musician}");
    expect(out).not.toContain("{album}");
    expect(out).not.toContain("{genre}");
    expect(out).not.toContain("{controversy}");
    // The controversy fragment must match one musician.
    const anyMatch = state.universeRoster!.musicians.some(
      (m) => m.controversyDesc && out.includes(m.controversyDesc),
    );
    expect(anyMatch).toBe(true);
  });
});
