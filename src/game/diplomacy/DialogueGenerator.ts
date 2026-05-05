import type { Ambassador, Contract } from "../../data/types.ts";

// ── Contract-acceptance dialogue ───────────────────────────────────────────
//
// Indexed by [contractType][personality]. Each entry is a function so
// empireName can be interpolated naturally.

type ContractDialogueFn = (empireName: string) => string;

const CONTRACT_ACCEPTANCE_LINES: Partial<
  Record<string, Partial<Record<string, ContractDialogueFn>>>
> = {
  empireUnlock: {
    formal: (e) =>
      `The ${e} Commerce Authority acknowledges receipt of your licensing application. Your trading rights within our borders are now provisionally active. Maintain your obligations and the relationship will prosper.`,
    warm: (e) =>
      `Welcome to the ${e} family of trade partners! We've been hoping someone of your caliber would apply. The lanes are yours — let's build something great together.`,
    suspicious: (e) =>
      `Hmm. So you've formalized with the ${e} at last. We've been watching your operations for some time. Do not give us reason to regret this arrangement.`,
    mercenary: (e) =>
      `License filed. Credits cleared. The ${e} trade corridor is now open to your hulls. Keep the cargo moving and we won't have any problems.`,
  },
  passengerFerry: {
    formal: (e) =>
      `${e} is pleased to formalize this passenger service agreement. Our citizens travel under the expectation of comfort and punctuality. We trust your operation will reflect those standards.`,
    warm: (_e) =>
      `Oh, this is wonderful! Our people have been waiting for a reliable carrier on this route. You're going to make a lot of families very happy. Safe travels to you and your crews!`,
    suspicious: (_e) =>
      `Passenger work, is it. Very well. Just know that our people talk — and we will hear about it if anything goes wrong. Deliver them safely.`,
    mercenary: (e) =>
      `Bodies in seats, credits in your account. ${e} standard passenger protocol applies. Don't lose any of them.`,
  },
  emergencySupply: {
    formal: (e) =>
      `${e} has declared this supply route a critical priority. Your prompt acceptance is noted. Delays will not be tolerated under any circumstance. We are counting on you.`,
    warm: (e) =>
      `Thank you — truly. The situation on the ground is difficult and your willingness to step up means everything. The people of ${e} won't forget this.`,
    suspicious: (_e) =>
      `This is an emergency and you are our only option right now. Don't mistake our need for trust. Deliver what was promised, on time.`,
    mercenary: (e) =>
      `Emergency rates, emergency expectations. ${e} is paying a premium — that means you don't miss a single delivery window. Understood?`,
  },
  tradeAlliance: {
    formal: (e) =>
      `The formal trade alliance between our organisations and ${e} is hereby recognised. This agreement carries obligations on both sides. We expect mutual adherence to every clause.`,
    warm: (e) =>
      `A trade alliance! This is the beginning of something truly special. ${e} sees you as a genuine long-term partner — and we don't say that lightly. Here's to many profitable years ahead.`,
    suspicious: (e) =>
      `An alliance. Interesting. ${e} has had… disappointing experiences with such arrangements before. Prove you are different.`,
    mercenary: (e) =>
      `Alliance terms accepted. ${e} will move product through your network. You handle delivery, we handle the politics. Simple.`,
  },
  researchCourier: {
    formal: (e) =>
      `${e} Research Directorate has authorised your courier clearance. The materials you will carry are sensitive. Discretion is not optional — it is a condition of this contract.`,
    warm: (_e) =>
      `Oh good, you accepted! The research team is going to be so relieved. These shipments are the lifeblood of our whole programme. We're really grateful to have someone reliable on board.`,
    suspicious: (e) =>
      `Research courier work. Yes. You'll carry the crates. You won't inspect the crates. That is the entirety of what ${e} requires of you.`,
    mercenary: (e) =>
      `Courier contract active. ${e} pays well for speed and silence. Don't ask about the contents. Don't open anything. Just deliver.`,
  },
};

const FALLBACK_LINES: Record<string, ContractDialogueFn> = {
  formal: (e) =>
    `${e} confirms the contract terms have been accepted. We expect professional conduct throughout the duration of this arrangement.`,
  warm: (e) =>
    `Wonderful news — the contract is confirmed! ${e} is genuinely excited to be working with you. Let's make this a partnership to remember.`,
  suspicious: (e) =>
    `So. You've signed with ${e}. We'll be watching how this unfolds.`,
  mercenary: (e) =>
    `Contract accepted. ${e} pays on delivery. Don't overthink it.`,
};

export function generateContractDialogue(
  contract: Contract,
  ambassador: Ambassador | undefined,
  empireName: string,
): string {
  const personality = ambassador?.personality ?? "formal";
  const typeLines = CONTRACT_ACCEPTANCE_LINES[contract.type];
  const fn = typeLines?.[personality] ?? FALLBACK_LINES[personality];
  return fn
    ? fn(empireName)
    : `${empireName} acknowledges your contract acceptance.`;
}
