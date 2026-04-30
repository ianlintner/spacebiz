import type { AmbassadorPersonality } from "../../data/types.ts";
import type { StandingTierName } from "./StandingTiers.ts";

export type FlavorKind =
  | "giftAccepted"
  | "giftRefused"
  | "lobbySuccess"
  | "lobbyFailed"
  | "nonCompeteAccepted"
  | "nonCompeteRefused"
  | "surveilExposed"
  | "tierShift";

function fillNeutralAcross(
  text: string,
): Record<AmbassadorPersonality, Record<StandingTierName, string>> {
  const tiers: StandingTierName[] = [
    "Hostile",
    "Cold",
    "Neutral",
    "Warm",
    "Allied",
  ];
  const personalities: AmbassadorPersonality[] = [
    "formal",
    "mercenary",
    "suspicious",
    "warm",
  ];
  const out = {} as Record<
    AmbassadorPersonality,
    Record<StandingTierName, string>
  >;
  for (const p of personalities) {
    out[p] = {} as Record<StandingTierName, string>;
    for (const t of tiers) out[p][t] = text;
  }
  return out;
}

const TEMPLATES: Record<
  FlavorKind,
  Record<AmbassadorPersonality, Record<StandingTierName, string>>
> = {
  giftAccepted: {
    formal: {
      Hostile: "Your gift is logged into the registry, dryly.",
      Cold: "The ambassador thanks you with measured precision.",
      Neutral: "Your gift is acknowledged through proper channels.",
      Warm: "The ambassador receives your gift with a courteous smile.",
      Allied: "Your gift will be celebrated at the next state dinner.",
    },
    mercenary: {
      Hostile: "They take it. Don't expect gratitude.",
      Cold: "Cash translates well in any language.",
      Neutral: "They like presents. Keep them coming.",
      Warm: "They count it twice and grin.",
      Allied: "Their accountants will remember this.",
    },
    suspicious: {
      Hostile: "They accept warily, watching for strings.",
      Cold: "They accept, but not before scanning it.",
      Neutral: "They eye the gift, then accept.",
      Warm: "Even friends, they say, deserve scrutiny — accepted.",
      Allied: "Trust is earned. They'll allow you another step.",
    },
    warm: {
      Hostile: "Surprised, they manage a smile.",
      Cold: "A warmer note creeps into their voice.",
      Neutral: "They thank you genuinely.",
      Warm: "They beam at the gesture.",
      Allied: "They embrace your envoy at the door.",
    },
  },
  giftRefused: {
    formal: {
      Hostile: "Refused, with formal regret.",
      Cold: "Refused, with reasons cited.",
      Neutral: "Refused, politely.",
      Warm: "Refused — a procedural matter, they say.",
      Allied: "Refused — protocol forbids it this season.",
    },
    mercenary: {
      Hostile: "Returned with a sneer.",
      Cold: "Not enough.",
      Neutral: "Pass.",
      Warm: "Save it for your enemies.",
      Allied: "Spend it where it'll do more good.",
    },
    suspicious: {
      Hostile: "Refused. They suspect a hook.",
      Cold: "Refused. The gift is unwrapped, examined, sent back.",
      Neutral: "Refused — too many strings, they say.",
      Warm: "Refused, regretfully.",
      Allied: "Refused — they'd rather you keep your hand.",
    },
    warm: {
      Hostile: "Refused, gently.",
      Cold: "Refused with a smile that doesn't reach the eyes.",
      Neutral: "Refused, with apologies.",
      Warm: "Refused — they say a gift between friends should be smaller.",
      Allied: "Refused — they say there's no need.",
    },
  },
  lobbySuccess: fillNeutralAcross("Your argument lands."),
  lobbyFailed: fillNeutralAcross("Your argument fizzles."),
  nonCompeteAccepted: fillNeutralAcross("The agreement is signed."),
  nonCompeteRefused: fillNeutralAcross("The deal is declined."),
  surveilExposed: fillNeutralAcross(
    "They trace the breach to your operatives.",
  ),
  tierShift: fillNeutralAcross("The relationship has shifted."),
};

export function getFlavor(
  kind: FlavorKind,
  personality: AmbassadorPersonality,
  tier: StandingTierName,
): string {
  return (
    TEMPLATES[kind]?.[personality]?.[tier] ??
    TEMPLATES[kind]?.formal?.Neutral ??
    "..."
  );
}
