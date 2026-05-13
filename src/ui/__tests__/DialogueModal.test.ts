import { describe, it, expect } from "vitest";
import {
  openSfxKeyForVariant,
  resultSfxKey,
  classifyOutcome,
} from "../DialogueModal.ts";

describe("DialogueModal helpers", () => {
  describe("openSfxKeyForVariant", () => {
    it("returns dialogue_open_<variant>", () => {
      expect(openSfxKeyForVariant("standard")).toBe("dialogue_open_standard");
      expect(openSfxKeyForVariant("news")).toBe("dialogue_open_news");
      expect(openSfxKeyForVariant("alert")).toBe("dialogue_open_alert");
      expect(openSfxKeyForVariant("memo")).toBe("dialogue_open_memo");
    });
  });

  describe("resultSfxKey", () => {
    it("returns result_<tier>_<category> for positive/negative", () => {
      expect(resultSfxKey("positive", "operational")).toBe(
        "result_positive_operational",
      );
      expect(resultSfxKey("negative", "financial")).toBe(
        "result_negative_financial",
      );
    });

    it("returns null for neutral tier (caller falls back to ui_confirm)", () => {
      expect(resultSfxKey("neutral", "operational")).toBeNull();
    });

    it("falls back to narrative category when undefined", () => {
      expect(resultSfxKey("positive", undefined)).toBe(
        "result_positive_narrative",
      );
    });
  });

  describe("classifyOutcome re-export", () => {
    it("returns the same tiers as the source helper", () => {
      expect(classifyOutcome(70)).toBe("positive");
      expect(classifyOutcome(50)).toBe("neutral");
      expect(classifyOutcome(10)).toBe("negative");
    });
  });
});
