import {
  BASE_CARGO_PRICES,
  MAX_TURNS,
  PLANET_CARGO_PROFILES,
  STARTING_CASH,
  SHIP_TEMPLATES,
} from "./data/constants.ts";
import { CargoType, PlanetType, ShipClass } from "./data/types.ts";

export interface HeroMetric {
  label: string;
  value: string;
  detail: string;
}

export interface FeatureCard {
  eyebrow: string;
  title: string;
  body: string;
}

export interface GuideSection {
  title: string;
  summary: string;
  bullets: string[];
}

export interface CheatSheetCard {
  title: string;
  caption: string;
  bullets: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface DisclosureCard {
  title: string;
  summary: string;
  bullets: string[];
}

const STARTER_SHIPS = [
  SHIP_TEMPLATES[ShipClass.CargoShuttle],
  SHIP_TEMPLATES[ShipClass.PassengerShuttle],
];

const LABELS: Record<string, string> = {
  [CargoType.Passengers]: "Passengers",
  [CargoType.RawMaterials]: "Raw Materials",
  [CargoType.Food]: "Food",
  [CargoType.Technology]: "Technology",
  [CargoType.Luxury]: "Luxury Goods",
  [CargoType.Hazmat]: "Hazmat",
  [CargoType.Medical]: "Medical Supplies",
  [PlanetType.Terran]: "Terran",
  [PlanetType.Industrial]: "Industrial",
  [PlanetType.Mining]: "Mining",
  [PlanetType.Agricultural]: "Agricultural",
  [PlanetType.HubStation]: "Hub Station",
  [PlanetType.Resort]: "Resort",
  [PlanetType.Research]: "Research",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function labelFor(value: string): string {
  return LABELS[value] ?? value;
}

export const HERO_METRICS: HeroMetric[] = [
  {
    label: "Opening Capital",
    value: formatCurrency(STARTING_CASH),
    detail:
      "Enough to launch routes, buy upgrades, or make a spectacularly confident mistake.",
  },
  {
    label: "Campaign Length",
    value: `${MAX_TURNS} turns`,
    detail:
      "Every planning phase matters because the galaxy does not grade on a curve.",
  },
  {
    label: "Starter Fleet",
    value: STARTER_SHIPS.map((ship) => ship.name).join(" + "),
    detail:
      "Begin with one cargo shuttle and one passenger shuttle ready for their first trade run.",
  },
];

export const FEATURE_CARDS: FeatureCard[] = [
  {
    eyebrow: "GALACTIC TRADE",
    title: "Grow a freight company instead of just piloting one ship",
    body: "Choose routes, assign hulls, read market pressure, and turn a tiny transport outfit into a sector-scale business.",
  },
  {
    eyebrow: "DYNAMIC ECONOMY",
    title: "Exploit supply, demand, and trend momentum",
    body: "Planet types produce and consume different cargo, so strong routes come from reading the economy instead of guessing.",
  },
  {
    eyebrow: "TURN SIMULATION",
    title: "Plan boldly, then watch the quarter resolve",
    body: "Each turn blends route revenue, fuel costs, maintenance, market shifts, and story events into one satisfying report.",
  },
  {
    eyebrow: "RETRO COMMAND DECK",
    title: "A playable control room framed like a sci-fi operations screen",
    body: "The site keeps the game front and center, then layers manual, help, and production notes around it like shipboard systems.",
  },
];

export const MANUAL_SECTIONS: GuideSection[] = [
  {
    title: "1. Pick your first foothold",
    summary:
      "A new run generates a procedural galaxy and gives you three possible starting systems to choose from.",
    bullets: [
      `You begin with ${formatCurrency(STARTING_CASH)} in cash and ${STARTER_SHIPS.length} starter ships.`,
      "Look for a location that places multiple planet types within reach so your first routes can pivot quickly.",
      "Early flexibility beats perfect specialization because the first few turns teach you what the local economy wants.",
    ],
  },
  {
    title: "2. Match exporters with importers",
    summary:
      "The most reliable profits come from moving goods toward worlds that demand them and away from worlds that produce them.",
    bullets: [
      "Mining worlds usually export raw materials and hazmat.",
      "Agricultural worlds are dependable food producers.",
      "Industrial, Terran, Hub Station, Research, and Resort worlds become excellent sinks for the right goods or passengers.",
    ],
  },
  {
    title: "3. Assign the right ship to the route",
    summary:
      "Passenger lanes, mixed cargo, and bulk freight all reward different ship classes and timing decisions.",
    bullets: [
      "Cargo Shuttle is a cheap, efficient early hauler for basic freight loops.",
      "Passenger Shuttle gives you a strong option when population and travel demand outpace goods margins.",
      "Faster ships can cycle more often, while bulky ships make saturation and route selection even more important.",
    ],
  },
  {
    title: "4. End the turn and read the report",
    summary:
      "Once routes are assigned, the simulation resolves revenue, fuel burn, maintenance, and event outcomes.",
    bullets: [
      "Turn reports reveal which routes are quietly carrying the company and which ones are eating your margin.",
      "Fuel price changes and active events can flip a great route into a mediocre one overnight.",
      "Use review scenes to decide whether to double down, diversify, or cut losses.",
    ],
  },
  {
    title: "5. Manage wear, debt, and market saturation",
    summary:
      "Profit is not just about top-line revenue; it is about surviving the ugly little costs between turns.",
    bullets: [
      "Condition decays over time, and unreliable ships are more likely to break down.",
      "Loans can unlock growth, but payments and interest are drag if routes are not already working.",
      "Repeatedly hammering the same market can saturate prices, so diversify before margins collapse.",
    ],
  },
  {
    title: "6. Finish strong before the campaign clock runs out",
    summary: `A standard run lasts ${MAX_TURNS} turns, so your late-game score reflects both expansion and discipline.`,
    bullets: [
      "Keep enough liquidity to absorb bad events without panic-selling your strategy.",
      "Upgrade only when the new ship unlocks better throughput, better route coverage, or both.",
      "Healthy cash flow across the final turns usually beats one dramatic all-in gamble.",
    ],
  },
];

export const HELP_TOPICS: GuideSection[] = [
  {
    title: "Early-game checklist",
    summary:
      "If you are starting fresh, this sequence gives you the least painful path to competence.",
    bullets: [
      "Choose a start with at least one obvious producer world and one obvious buyer nearby.",
      "Get one route profitable before creating a second one that distracts from it.",
      "Use the first report to check whether passengers or freight are carrying more of the load.",
    ],
  },
  {
    title: "How to read a market quickly",
    summary:
      "Think in pairs: where is something abundant, and where will people pay to see it arrive?",
    bullets: [
      "Export from planets whose identity naturally aligns with the cargo type.",
      "Import to planets whose profile shows demand for that cargo category.",
      "If a once-great lane cools off, rotate into a different commodity before you waste multiple turns.",
    ],
  },
  {
    title: "When to buy more ships",
    summary:
      "Expansion works best once your current route book already proves there is demand for extra lift.",
    bullets: [
      "Buy when a second ship can immediately slot into an already-identified profitable lane.",
      "Delay purchases if maintenance and fuel are already squeezing your margin.",
      "Specialized hulls are strongest when their route purpose is obvious before you spend the money.",
    ],
  },
  {
    title: "How to recover from a bad quarter",
    summary: "The fix is usually operational clarity, not panic clicking.",
    bullets: [
      "Check route performance first; underperforming routes are often the real culprit.",
      "Reduce exposure to costly or event-hit lanes and restore a smaller, steadier profit base.",
      "Only use loans when you can explain exactly how the borrowed cash restores earning power.",
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is Star Freight Tycoon real-time?",
    answer:
      "Nope. It is a turn-driven business sim. You make decisions during planning, then the simulation resolves the quarter and reports what happened.",
  },
  {
    question: "What should I transport first?",
    answer:
      "Start with the clearest producer-to-consumer route available in your opening neighborhood. Food, raw materials, and passengers often reveal easy early patterns.",
  },
  {
    question: "Why did a good route stop paying well?",
    answer:
      "Usually some mix of market saturation, a trend shift, fuel price changes, or event effects. The answer is often to rebalance instead of stubbornly repeating the same lane.",
  },
  {
    question: "Should I specialize or diversify?",
    answer:
      "Open with focus, then diversify once you have a reliable core loop. One good route teaches you more than three bad experiments.",
  },
  {
    question: "Can I play without reading the full manual?",
    answer:
      "Absolutely. The home screen keeps a quick-start summary, and the help section is built like a mission briefing rather than a novel.",
  },
];

export const DISCLOSURE_CARDS: DisclosureCard[] = [
  {
    title: "AI-assisted music and visual materials",
    summary:
      "This project discloses the use of AI-assisted creative assets where applicable, including music, concepts, or promotional-style visual materials.",
    bullets: [
      "Any AI-generated or AI-assisted output should be treated as a creative input, not an unreviewed final source of truth.",
      "Presentation materials can be iterated, edited, remixed, or replaced as the project evolves.",
      "This page includes the disclosure up front so players are not left guessing about production methods.",
    ],
  },
  {
    title: "Human-authored game design and implementation",
    summary:
      "Core game rules, TypeScript systems, balancing logic, and final implementation decisions remain deliberately curated by the developer.",
    bullets: [
      "Procedural generation, economy logic, scene flow, and simulation behavior are implemented in the game codebase.",
      "AI assistance does not replace testing, curation, or creative direction.",
      "Gameplay documentation on this page reflects the current implemented systems rather than marketing-only fiction.",
    ],
  },
  {
    title: "Why disclose it this clearly?",
    summary:
      "Because good credits and production notes build trust, and trust is a wildly underrated game mechanic.",
    bullets: [
      "Players deserve to know how the presentation layer was produced.",
      "Clear disclosure makes future asset updates easier to track.",
      "It keeps the site honest while still letting the project have personality and style.",
    ],
  },
];

export const STARTER_FLEET_CARDS: CheatSheetCard[] = STARTER_SHIPS.map(
  (ship) => ({
    title: ship.name,
    caption: `${ship.class === ShipClass.CargoShuttle ? "Freight" : "Passenger"} starter hull`,
    bullets: [
      `Capacity: ${ship.cargoCapacity > 0 ? `${ship.cargoCapacity} cargo` : `${ship.passengerCapacity} passengers`}`,
      `Speed: ${ship.speed} | Fuel efficiency: ${ship.fuelEfficiency.toFixed(1)}`,
      `Reliability: ${ship.baseReliability}% | Purchase cost: ${formatCurrency(ship.purchaseCost)}`,
    ],
  }),
);

export const PLANET_CHEAT_SHEET: CheatSheetCard[] = Object.entries(
  PLANET_CARGO_PROFILES,
).map(([planetType, profile]) => ({
  title: labelFor(planetType),
  caption: "Typical production and demand",
  bullets: [
    `Produces: ${profile.produces.map(labelFor).join(", ") || "No primary exports"}`,
    `Demands: ${profile.demands.map(labelFor).join(", ") || "Low structured demand"}`,
    "Use this as a routing heuristic, then verify live market prices before committing ships.",
  ],
}));

export const CARGO_CHEAT_SHEET: CheatSheetCard[] = Object.entries(
  BASE_CARGO_PRICES,
).map(([cargoType, price]) => ({
  title: labelFor(cargoType),
  caption: `Base market price: ${formatCurrency(price)}`,
  bullets: [
    "Actual returns change with supply, demand, saturation, and event modifiers.",
    "Compare destination demand with origin abundance before assigning a route.",
    cargoType === CargoType.Passengers
      ? "Passenger capacity matters more than freight volume here, so pick the right hull."
      : "Freight routes improve when a ship can carry enough volume to justify its operating costs.",
  ],
}));
