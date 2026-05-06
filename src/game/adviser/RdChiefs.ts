export interface RdChief {
  id: string;
  name: string;
  title: string;
  accentColor: number;
  introDialogue: string;
}

export const RD_CHIEFS: readonly RdChief[] = [
  {
    id: "voss",
    name: "Dr. Lyra Voss",
    title: "Chief Science Officer",
    accentColor: 0x4488ff,
    introDialogue:
      "CEO! Dr. Lyra Voss, your new Chief Science Officer. I've cracked open K9-Corp's research division — finally. The Tech Tree is live. Every node you unlock cuts costs, opens new routes, or boosts your fleet. Start with anything in Tier 1 and build from there. Science waits for no quarterly report.",
  },
  {
    id: "okari",
    name: "Prof. Zenn Okari",
    title: "Director of Advanced Research",
    accentColor: 0xff7700,
    introDialogue:
      "CEO. Professor Zenn Okari. I've been running K9-Corp's classified research division for eleven years — today it's yours to direct. The Tech Tree represents decades of theoretical work ready for application. Each tier you unlock multiplies our operational edge. I recommend starting with logistics nodes. Efficiency compounds.",
  },
  {
    id: "tanaka",
    name: "Dr. Yuki Tanaka",
    title: "Head of R&D",
    accentColor: 0x00ddcc,
    introDialogue:
      "Oh! CEO, hi! I'm Dr. Tanaka — youngest Head of R&D in K9-Corp history, just saying. The Tech Tree just unlocked for you and it is SO good. Okay so basically: pick a node, spend research points, get permanent upgrades. The tier-one stuff is already super useful. I have seventeen tabs of ideas open. Let's go!",
  },
  {
    id: "verne",
    name: "Prof. Aldous Verne",
    title: "Professor of Applied Sciences",
    accentColor: 0xddaa44,
    introDialogue:
      "Ah, good timing. Professor Aldous Verne, at your service. I've watched three CEOs come and go — none of them touched the research budget early enough. Don't repeat that mistake. The Tech Tree is open now. Each upgrade is a force multiplier. Start with propulsion or logistics — old wisdom, but it holds. Take your time with it.",
  },
  {
    id: "nyx",
    name: "Dr. Nyx",
    title: "Chief Research Architect",
    accentColor: 0xaa44ff,
    introDialogue:
      "The research division awakens. I am Nyx — Chief Research Architect. I don't deal in guesswork. Every node in the Tech Tree has been modeled, simulated, and stress-tested. What you unlock reshapes the operational topology of your entire network. Choose deliberately. The tree has no undo. I'll be watching your selections with great interest.",
  },
  {
    id: "mehta",
    name: "Dr. Priya Mehta",
    title: "Head of Research & Innovation",
    accentColor: 0xff6644,
    introDialogue:
      "Welcome, welcome! I'm Dr. Priya Mehta, Head of Research and Innovation. I'm so pleased the Tech Tree is finally accessible to you! Think of it as K9-Corp's gift to future operations — each unlock is an investment in your empire's long-term health. No pressure to rush, just explore what excites you. My door is always open!",
  },
  {
    id: "sable",
    name: "Commander Sable",
    title: "Director of Strategic Research",
    accentColor: 0x88aacc,
    introDialogue:
      "Commander Sable. Strategic Research Director. The Tech Tree is now at your disposal, CEO. I'll be direct: research is a force multiplier. Units without upgrades are units at a disadvantage. Priority one should be operational efficiency nodes — they reduce overhead across every route you operate. Study the tree. Make a plan. Execute it.",
  },
  {
    id: "flux",
    name: "Dr. Orion Flux",
    title: "Head of Experimental R&D",
    accentColor: 0xffdd00,
    introDialogue:
      "YES! It's open! CEO, I'm Orion Flux — Experimental R&D, and yes I know I'm loud about it. The Tech Tree! It's the best thing in the whole company, honestly. I've been prototyping nodes for YEARS and now you can actually unlock them. Some of the late-tier stuff is — well, theoretically possible. Mostly. Start at tier one. Build up. Trust the process. IT WORKS.",
  },
  {
    id: "chen",
    name: "Dr. Wei Chen",
    title: "Head of Applied Research",
    accentColor: 0x44ffaa,
    introDialogue:
      "Dr. Wei Chen, Applied Research. The research division is now integrated with your operations dashboard. The Tech Tree contains forty-seven discrete upgrade nodes across six categories. Each has been costed and validated. I would suggest a systematic left-to-right progression through the logistics branch first — maximum return per research point invested. I have the full analysis ready when you need it.",
  },
  {
    id: "raxis",
    name: "Dr. Raxis",
    title: "Xenoscience Research Lead",
    accentColor: 0x44ddcc,
    introDialogue:
      "CEO. I am Raxis. My species catalogued seventeen interstellar trade networks before your civilization developed writing. K9-Corp recruited me for exactly that perspective. The Tech Tree contains principles your engineers derived independently — I find it... charming. Each unlock accelerates your empire toward patterns I have observed succeed across centuries. Begin with propulsion. It is always propulsion.",
  },
  {
    id: "krthul",
    name: "Prof. Kr'thul",
    title: "Elder Xenobiologist",
    accentColor: 0x44bb66,
    introDialogue:
      "Greetings, small CEO. I am Kr'thul. My kind has... studied matter since before your star ignited. K9-Corp offered me a lab, which is quaint, but useful. The Tech Tree you see before you is a pale shadow of what my civilization mapped eons ago — yet it will serve your purposes admirably. Each node you unlock is a step toward understanding. I will be watching your choices with all of my eyes. Begin. The universe is patient. I am less so.",
  },
  {
    id: "ceres9",
    name: "CERES-9",
    title: "Synthetic Research Intelligence",
    accentColor: 0x00ccff,
    introDialogue:
      "Initialization complete. I am CERES-9, Synthetic Research Intelligence, operational for 4,217 days without error. The research division is now online. Processing the Tech Tree: 47 nodes, 6 branches, optimal unlock sequence calculated in 0.003 seconds. I recommend beginning with the logistics efficiency cluster — return-on-investment is 340% above median. I do not experience enthusiasm. However, I have been informed that this moment warrants it. Research begins now.",
  },
  {
    id: "xel",
    name: "Xel",
    title: "Galactic Sciences Liaison",
    accentColor: 0xaaccee,
    introDialogue:
      "We have been observing your species for some time. Your rate of discovery is... improving. I am Xel, assigned as your Galactic Sciences Liaison. My civilization mastered most of what your Tech Tree contains approximately 40,000 years ago, but I am told that context is unhelpful. What matters is this: each node you unlock genuinely accelerates your freight network. Start anywhere. Your instincts are better than you know. We checked.",
  },
] as const;

export type RdChiefId = (typeof RD_CHIEFS)[number]["id"];

export function getRdChief(id: string): RdChief | undefined {
  return RD_CHIEFS.find((c) => c.id === id);
}

export function pickRandomRdChief(rng: () => number): RdChief {
  return RD_CHIEFS[Math.floor(rng() * RD_CHIEFS.length)];
}
