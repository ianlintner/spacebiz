import { describe, it, expect } from "vitest";
import {
  addTag,
  removeTagsByKind,
  hasTagOfKind,
  findTagOfKind,
  expireTags,
} from "../StandingTags.ts";
import type { StandingTag } from "../../../data/types.ts";

const tag = (kind: StandingTag["kind"], expiresOnTurn: number): StandingTag => {
  switch (kind) {
    case "OweFavor":
    case "RecentlyGifted":
    case "Sabotaged":
      return { kind, expiresOnTurn };
    case "SuspectedSpy":
      return { kind, suspectId: "player", expiresOnTurn };
    case "NonCompete":
      return { kind, protectedEmpireIds: ["e1"], expiresOnTurn };
    case "LeakedIntel":
      return { kind, lens: "cash", value: "1000", expiresOnTurn };
  }
};

describe("StandingTags", () => {
  it("adds a tag (immutable)", () => {
    const tags: readonly StandingTag[] = [];
    const next = addTag(tags, tag("OweFavor", 5));
    expect(next).toHaveLength(1);
    expect(tags).toHaveLength(0);
  });

  it("hasTagOfKind / findTagOfKind", () => {
    const tags = [tag("OweFavor", 5), tag("RecentlyGifted", 3)];
    expect(hasTagOfKind(tags, "OweFavor")).toBe(true);
    expect(hasTagOfKind(tags, "SuspectedSpy")).toBe(false);
    expect(findTagOfKind(tags, "RecentlyGifted")?.expiresOnTurn).toBe(3);
  });

  it("removeTagsByKind drops all tags of the given kind", () => {
    const tags = [
      tag("OweFavor", 5),
      tag("OweFavor", 7),
      tag("RecentlyGifted", 3),
    ];
    const next = removeTagsByKind(tags, "OweFavor");
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("RecentlyGifted");
  });

  it("expireTags strips tags whose expiresOnTurn <= currentTurn", () => {
    const tags = [
      tag("OweFavor", 5),
      tag("RecentlyGifted", 10),
      tag("SuspectedSpy", 3),
    ];
    const next = expireTags(tags, 5);
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("RecentlyGifted");
  });
});
