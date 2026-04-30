import { describe, it, expect } from "vitest";
import {
  cooldownKey,
  isOnCooldown,
  setCooldown,
  decrementCooldowns,
} from "../Cooldowns.ts";

describe("Cooldowns", () => {
  it("builds single-target keys", () => {
    expect(cooldownKey("giftEmpire", "vex")).toBe("giftEmpire:vex");
  });

  it("builds compound keys for lobby (target + subject)", () => {
    expect(cooldownKey("lobbyFor", "vex", "chen")).toBe("lobbyFor:vex:chen");
  });

  it("isOnCooldown true when nextAvailableTurn > currentTurn", () => {
    const cd = { "giftEmpire:vex": 5 };
    expect(isOnCooldown(cd, "giftEmpire:vex", 4)).toBe(true);
    expect(isOnCooldown(cd, "giftEmpire:vex", 5)).toBe(false);
    expect(isOnCooldown(cd, "giftEmpire:vex", 6)).toBe(false);
    expect(isOnCooldown(cd, "missing", 1)).toBe(false);
  });

  it("setCooldown returns a new map", () => {
    const cd = {};
    const next = setCooldown(cd, "giftEmpire:vex", 7);
    expect(next).toEqual({ "giftEmpire:vex": 7 });
    expect(cd).toEqual({});
  });

  it("decrementCooldowns drops keys that reach <= currentTurn", () => {
    const cd = { a: 5, b: 10, c: 3 };
    const next = decrementCooldowns(cd, 5);
    expect(next).toEqual({ b: 10 });
  });
});
