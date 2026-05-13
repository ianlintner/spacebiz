import type { OutcomeTier, SpeakerMood } from "../../data/types.ts";

const POSITIVE_THRESHOLD = 70;
const NEUTRAL_THRESHOLD = 40;

/**
 * Classify a success percentage into a narrative outcome tier. Thresholds
 * mirror successColor() in the old DilemmaScene: ≥70 is "won", ≥40 is "ok",
 * <40 is "rough".
 */
export function classifyOutcome(successPercent: number): OutcomeTier {
  if (successPercent >= POSITIVE_THRESHOLD) return "positive";
  if (successPercent >= NEUTRAL_THRESHOLD) return "neutral";
  return "negative";
}

/**
 * Pick the speaker portrait mood that matches the outcome tier. The intro
 * stage always uses "standby"; the result stage uses success/analyzing/alert
 * per tier.
 */
export function moodForOutcome(tier: OutcomeTier): SpeakerMood {
  switch (tier) {
    case "positive":
      return "success";
    case "neutral":
      return "analyzing";
    case "negative":
      return "alert";
  }
}
