import type { AmbassadorPersonality } from "../../data/types.ts";
import type { StandingTierName } from "./StandingTiers.ts";

type GreetingFn = (empireName: string) => string;

const GREETINGS: Record<
  StandingTierName,
  Record<AmbassadorPersonality, GreetingFn>
> = {
  Hostile: {
    formal: (e) =>
      `The ${e} Trade Secretariat has reluctantly processed your transit application. You are here on sufferance. Maintain full compliance with all tariff schedules and do not overstay your welcome.`,
    warm: (e) =>
      `I won't pretend this is a joyous occasion. You're here, ${e} has authorised your routes — call it a business arrangement and nothing more. Don't push for more than that.`,
    suspicious: (e) =>
      `So. You've forced your way into our corridors. We have logged your registration under protest. Every shipment you run through ${e} space will be monitored. Consider yourself watched.`,
    mercenary: (e) =>
      `Registered. Don't celebrate. You operate in ${e} because we take the fees — not because we want you here. File your manifests on time and stay out of restricted zones.`,
  },
  Cold: {
    formal: (e) =>
      `The ${e} Commerce Bureau acknowledges your licensing request. Provisional trade access has been granted. Maintain your tariff obligations and we will revisit your standing at the next review cycle.`,
    warm: (e) =>
      `Welcome to ${e}, I suppose. We're cautious about new operators — too many have come through promising big things and delivered very little. Prove you're different and we'll warm up.`,
    suspicious: (e) =>
      `${e} has authorised your initial routes. For now. We have not yet formed a view of you — that comes with time and observation. Do not make us regret this decision.`,
    mercenary: (e) =>
      `You're in. Fees are posted, schedules are posted, penalties are posted. Hit your numbers in ${e} and nobody will have any problems. Miss them and we talk.`,
  },
  Neutral: {
    formal: (e) =>
      `On behalf of ${e}, I extend a formal welcome. Your trading license is now active. We look forward to a productive relationship governed by mutual adherence to our trade agreements.`,
    warm: (e) =>
      `Welcome to ${e}! We're happy to have another operator in our network. Nothing too dramatic — solid work, fair deals, and good cargo moving through good lanes. That's all we ask.`,
    suspicious: (e) =>
      `You're registered with ${e}. We take newcomers on their performance record, not their reputation. Show us what you can do and we'll reassess. For now — welcome, provisionally.`,
    mercenary: (e) =>
      `License active. ${e} has plenty of lanes and plenty of cargo. You run routes, we earn tariffs, everyone makes money. That's the arrangement. Don't complicate it.`,
  },
  Warm: {
    formal: (e) =>
      `The ${e} Trade Commission extends sincere greetings. Your reputation precedes you and we are pleased to formalise what promises to be a mutually beneficial relationship. We expect great things from this partnership.`,
    warm: (e) =>
      `Oh, this is wonderful! We've been hoping you'd open lanes with ${e}. You have quite the reputation out there and we are genuinely excited to be part of your network. Welcome — truly!`,
    suspicious: (e) =>
      `${e} welcomes you — and I don't say that lightly. We've watched your operations and you've earned some respect. Trust is still a long road, but you're off to a very good start.`,
    mercenary: (e) =>
      `Good to have you in ${e}. The lanes here are profitable and we run a clean operation. You've got a solid reputation — that counts for something. Let's both make some money.`,
  },
  Allied: {
    formal: (e) =>
      `On behalf of all ${e}, it is my honour to welcome you as a recognised partner of our trade network. You have demonstrated the qualities we value most. Our corridors are yours — may this partnership endure.`,
    warm: (e) =>
      `You're HERE! Oh, this is such a big moment. ${e} considers you genuine family at this point — the work you've done, the way you operate — we couldn't ask for a better partner. The whole empire is rooting for you!`,
    suspicious: (e) =>
      `I'll admit — I didn't expect to be saying this. But ${e} considers you an ally. A real one. I've watched you closely and you have earned every bit of that title. Don't make me regret the sentiment.`,
    mercenary: (e) =>
      `You're one of us now. ${e} doesn't hand out ally status lightly — it means we trust your numbers, your routes, and your judgment. Let's keep building. We're stronger together than apart.`,
  },
};

export function buildAmbassadorGreeting(
  personality: AmbassadorPersonality,
  tier: StandingTierName,
  empireName: string,
): string {
  return GREETINGS[tier][personality](empireName);
}
