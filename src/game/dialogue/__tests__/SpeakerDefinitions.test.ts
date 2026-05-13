import { describe, it, expect } from "vitest";
import {
  ADVISER_DEFS,
  DILEMMA_SPEAKER_BY_CATEGORY,
  adviserPortraitKey,
  newscasterPortraitKey,
  speakerPortraitKey,
  speakerDisplayName,
  speakerDisplayTitle,
  speakerAccentColor,
  dilemmaSpeaker,
  newsSpeakerFor,
  defaultVariantForCategory,
} from "../SpeakerDefinitions.ts";
import type { DilemmaCategory, SpeakerRef } from "../../../data/types.ts";
import { NEWSCASTER_DEFS } from "../../../generation/news/newscasters.ts";

describe("SpeakerDefinitions", () => {
  describe("DILEMMA_SPEAKER_BY_CATEGORY", () => {
    it("maps every DilemmaCategory to a registered adviser archetype", () => {
      const categories: DilemmaCategory[] = [
        "operational",
        "diplomatic",
        "financial",
        "narrative",
        "opportunity",
      ];
      for (const cat of categories) {
        const archetypeId = DILEMMA_SPEAKER_BY_CATEGORY[cat];
        expect(ADVISER_DEFS[archetypeId]).toBeDefined();
        expect(ADVISER_DEFS[archetypeId].name).toBeTruthy();
      }
    });
  });

  describe("adviserPortraitKey", () => {
    it("composes adviser-<stem>-<mood> keys", () => {
      expect(adviserPortraitKey("chen", "standby")).toBe(
        "adviser-chen-standby",
      );
      expect(adviserPortraitKey("voss", "alert")).toBe("adviser-voss-alert");
    });

    it("falls back to the raw archetype id when no def exists", () => {
      expect(adviserPortraitKey("unknown_archetype", "success")).toBe(
        "adviser-unknown_archetype-success",
      );
    });
  });

  describe("newscasterPortraitKey", () => {
    it("returns the NEWSCASTER_DEFS portraitKey for known types", () => {
      expect(newscasterPortraitKey("anchor")).toBe(
        NEWSCASTER_DEFS.anchor.portraitKey,
      );
      expect(newscasterPortraitKey("finance")).toBe(
        NEWSCASTER_DEFS.finance.portraitKey,
      );
    });
  });

  describe("speakerPortraitKey", () => {
    it("dispatches by pool", () => {
      const adviser: SpeakerRef = {
        archetypeId: "rex",
        pool: "adviser",
        mood: "success",
      };
      const newscaster: SpeakerRef = {
        archetypeId: "finance",
        pool: "newscaster",
        mood: "standby",
      };
      expect(speakerPortraitKey(adviser)).toBe("adviser-rex-success");
      expect(speakerPortraitKey(newscaster)).toBe(
        NEWSCASTER_DEFS.finance.portraitKey,
      );
    });
  });

  describe("speakerDisplayName / Title / accentColor", () => {
    it("returns adviser metadata", () => {
      const ref: SpeakerRef = {
        archetypeId: "chen",
        pool: "adviser",
        mood: "standby",
      };
      expect(speakerDisplayName(ref)).toBe(ADVISER_DEFS.chen.name);
      expect(speakerDisplayTitle(ref)).toBe(ADVISER_DEFS.chen.title);
      expect(speakerAccentColor(ref)).toBe(ADVISER_DEFS.chen.accentColor);
    });

    it("returns newscaster metadata", () => {
      const ref: SpeakerRef = {
        archetypeId: "finance",
        pool: "newscaster",
        mood: "standby",
      };
      expect(speakerDisplayName(ref)).toBe(NEWSCASTER_DEFS.finance.name);
      expect(speakerDisplayTitle(ref)).toBe(NEWSCASTER_DEFS.finance.title);
      expect(speakerAccentColor(ref)).toBe(NEWSCASTER_DEFS.finance.accentColor);
    });
  });

  describe("dilemmaSpeaker", () => {
    it("uses category default when no override", () => {
      const s = dilemmaSpeaker("operational", "standby");
      expect(s.archetypeId).toBe(DILEMMA_SPEAKER_BY_CATEGORY.operational);
      expect(s.pool).toBe("adviser");
    });

    it("honours archetype override", () => {
      const s = dilemmaSpeaker("operational", "alert", "raxis");
      expect(s.archetypeId).toBe("raxis");
      expect(s.mood).toBe("alert");
    });

    it("falls back to rex when category is undefined", () => {
      const s = dilemmaSpeaker(undefined, "standby");
      expect(s.archetypeId).toBe("rex");
    });
  });

  describe("newsSpeakerFor", () => {
    it("returns a newscaster pool ref", () => {
      const s = newsSpeakerFor("stock");
      expect(s.pool).toBe("newscaster");
      expect(s.archetypeId).toBeTruthy();
    });
  });

  describe("defaultVariantForCategory", () => {
    it("maps each category to a variant", () => {
      expect(defaultVariantForCategory("operational")).toBe("standard");
      expect(defaultVariantForCategory("diplomatic")).toBe("news");
      expect(defaultVariantForCategory("financial")).toBe("memo");
      expect(defaultVariantForCategory("narrative")).toBe("standard");
      expect(defaultVariantForCategory("opportunity")).toBe("standard");
      expect(defaultVariantForCategory(undefined)).toBe("standard");
    });
  });
});
