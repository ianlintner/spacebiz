import type { AmbassadorPersonality } from "../../data/types.ts";
import type { RivalMessageKind } from "../../data/types.ts";

type DialogueFn = (companyName: string) => string;

const DIALOGUE: Record<
  RivalMessageKind,
  Record<AmbassadorPersonality, DialogueFn>
> = {
  taunt: {
    formal: (c) =>
      `The performance metrics from this quarter have not gone unnoticed. ${c} is currently managing twice your network footprint. I trust this disparity will motivate some strategic recalibration on your end.`,
    warm: (c) =>
      `Heard about your quarter! ${c} just hit a new record — such a shame you weren't quite there with us. No hard feelings, genuinely. Maybe next time? The gap is very closable. Probably.`,
    suspicious: (c) =>
      `You've seen the numbers, I assume. ${c} doesn't celebrate early — but we're watching your moves very carefully. The gap is widening. We find that... clarifying.`,
    mercenary: (c) =>
      `${c} cleared twice your margins this quarter. Numbers don't lie. If I were you, I'd be revisiting every route you're running and asking why they're not performing.`,
  },

  warning: {
    formal: (c) =>
      `${c} has noted your recent expansion into lanes we have historically maintained. We expect this overlap to be temporary. Our legal team is reviewing the relevant charter terms with considerable interest.`,
    warm: (c) =>
      `Hey, just a friendly heads-up — ${c} has been running those lanes for years. We're not trying to be territorial, really! But maybe we could coordinate a little better before this gets awkward?`,
    suspicious: (c) =>
      `${c} did not overlook your recent route additions. We are aware of every lane you are now operating. Don't mistake our silence for indifference. We are watching.`,
    mercenary: (c) =>
      `${c} runs those lanes. You're running those lanes. This isn't going to be profitable for either of us. Back off, or we're going to have a very expensive problem.`,
  },

  espionageCaught: {
    formal: (c) =>
      `${c} is in receipt of intelligence confirming unauthorised surveillance of our operations. This constitutes a serious breach of professional conduct. We expect a formal explanation and immediate cessation.`,
    warm: (c) =>
      `Okay, wow. We know what you did. ${c} isn't going to pretend otherwise. Surveilling our routes? We genuinely thought we had a better working relationship than this. I'm... honestly disappointed.`,
    suspicious: (c) =>
      `You thought we wouldn't find out. ${c} has eyes across every corridor we operate. We know about the surveil. We know exactly what was accessed. We will remember this for a very long time.`,
    mercenary: (c) =>
      `Nice try. ${c} caught the leak. You want intel on our routes that badly, next time you can ask — for a fee. This was your one warning. There won't be another.`,
  },

  proposal: {
    formal: (c) =>
      `In the interest of mutual operational efficiency, ${c} would like to formally propose a non-competition arrangement covering our primary trade corridors. The terms would benefit both parties considerably. We await your response.`,
    warm: (c) =>
      `${c} has been thinking — what if we just stopped stepping on each other so much? Not a formal treaty or anything heavy. Just a friendly understanding: we stay out of your best lanes, you stay out of ours. Sound good?`,
    suspicious: (c) =>
      `${c} has a proposal. It's in both our interests not to constantly undercut each other. Acknowledge our primary corridors, we'll acknowledge yours. No obligations — just mutual awareness. Think about it.`,
    mercenary: (c) =>
      `${c} is proposing a non-compete. Simple deal: we don't undercut your main routes, you don't undercut ours. Everybody keeps their margins intact. This is a business decision. Yes or no.`,
  },

  congratulate: {
    formal: (c) =>
      `${c} has observed your recent operational performance with considerable interest. Sustained profitability at this level is not easily achieved. You have our professional respect — a distinction we do not offer lightly.`,
    warm: (c) =>
      `I know we're competitors, but seriously — ${c} is genuinely impressed by what you've been doing out there lately. That kind of run takes real skill and nerve. Well done. Truly, well done!`,
    suspicious: (c) =>
      `${c} has... noticed your performance lately. We don't hand out acknowledgements lightly, and we certainly don't hand them out often. But you've been running a surprisingly solid operation. I'll admit it.`,
    mercenary: (c) =>
      `You've been putting up solid numbers lately. ${c} sees it. Competitors don't usually get any respect from us, but you've earned a nod. Don't let it slow you down.`,
  },

  flavor: {
    formal: (c) =>
      `${c} periodically makes contact with operators of note within our sector. Your routes have come to our attention. We anticipate your continued professional conduct across the lanes you share with our network. That is all.`,
    warm: (c) =>
      `Just wanted to check in! ${c} keeps tabs on everyone in the sector and honestly, you're one of the more interesting operators out there right now. Keep doing what you're doing — it's genuinely fun to watch!`,
    suspicious: (c) =>
      `${c} watches the lanes. We always have. You're not exceptional — but you are not invisible either. Consider this a reminder that we notice. We always notice. Always have.`,
    mercenary: (c) =>
      `${c} monitors competitive traffic across all operating corridors as a matter of standard practice. You're on our list. That's neither a threat nor a promise. Just information you might find useful.`,
  },

  breachOfAgreement: {
    formal: (c) =>
      `${c} has documented a clear violation of the non-compete arrangement we formalised. You have opened routes into lanes explicitly covered by our agreement. Consider this a formal notice of termination — and an expectation of consequences.`,
    warm: (c) =>
      `I genuinely can't believe this. We had an agreement, a real one — and you just... walked right into our lanes anyway. ${c} isn't going to forget this. That trust? Gone. Completely gone.`,
    suspicious: (c) =>
      `${c} knew you would do this. We signed that agreement watching you. The moment your guard went down, you moved in. This is exactly why we don't trust competitors. Don't expect any further goodwill from us.`,
    mercenary: (c) =>
      `You broke the deal. ${c} noticed immediately. Our non-compete is void — and we're treating you as a direct competitor from this turn forward. Hope the routes were worth it.`,
  },
};

export interface RivalDialogueResult {
  text: string;
  /** For proposal messages — choice labels. */
  choices?: [string, string];
}

export function buildRivalMessageDialogue(
  kind: RivalMessageKind,
  personality: AmbassadorPersonality,
  companyName: string,
): RivalDialogueResult {
  const text = DIALOGUE[kind][personality](companyName);
  if (kind === "proposal") {
    return { text, choices: ["Accept", "Decline"] };
  }
  return { text };
}
