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
    detail: "Starting treasury available at campaign launch.",
  },
  {
    label: "Campaign Length",
    value: `${MAX_TURNS} turns`,
    detail: "Fixed-length run where each quarter contributes to final score.",
  },
  {
    label: "Starter Fleet",
    value: STARTER_SHIPS.map((ship) => ship.name).join(" + "),
    detail: "Initial ships provided to establish the first route network.",
  },
];

export const FEATURE_CARDS: FeatureCard[] = [
  {
    eyebrow: "GALACTIC TRADE",
    title: "Build and scale a multi-route transport company",
    body: "Manage routes, allocate ships, and grow from a local operator into a sector-wide logistics business.",
  },
  {
    eyebrow: "DYNAMIC ECONOMY",
    title: "Model supply, demand, and route saturation",
    body: "Planet profiles drive production and demand. Profitable routes emerge from matching exporters to importers over time.",
  },
  {
    eyebrow: "TURN SIMULATION",
    title: "Resolve each quarter with full operational accounting",
    body: "Every turn processes revenue, fuel burn, maintenance, market movement, and events into a detailed report.",
  },
  {
    eyebrow: "RETRO COMMAND DECK",
    title: "Playable home screen with integrated documentation",
    body: "The website combines the live build, manual, strategic reference, and production notes in a single operator-focused interface.",
  },
];

export const MANUAL_SECTIONS: GuideSection[] = [
  {
    title: "1. Pick your first foothold",
    summary:
      "A new run generates a procedural galaxy and gives you three possible starting systems to choose from.",
    bullets: [
      `You begin with ${formatCurrency(STARTING_CASH)} in cash and ${STARTER_SHIPS.length} starter ships.`,
      "Prioritize starts with multiple nearby planet types to keep routing options open.",
      "Use early turns to validate local demand before specializing.",
    ],
  },
  {
    title: "2. Match exporters with importers",
    summary:
      "The most reliable profits come from moving goods toward worlds that demand them and away from worlds that produce them.",
    bullets: [
      "Mining worlds usually export raw materials and hazmat.",
      "Agricultural worlds are dependable food producers.",
      "Industrial, Terran, Hub Station, Research, and Resort worlds are often high-demand destinations.",
    ],
  },
  {
    title: "3. Assign the right ship to the route",
    summary:
      "Passenger lanes, mixed cargo, and bulk freight all reward different ship classes and timing decisions.",
    bullets: [
      "Cargo Shuttle provides low-cost early freight capacity.",
      "Passenger Shuttle performs best on high-demand population corridors.",
      "High-speed hulls increase route frequency; high-capacity hulls require careful market targeting.",
    ],
  },
  {
    title: "4. End the turn and read the report",
    summary:
      "Once routes are assigned, the simulation resolves revenue, fuel burn, maintenance, and event outcomes.",
    bullets: [
      "Use turn reports to rank route performance and identify low-margin operations.",
      "Monitor fuel price shifts and events that can rapidly change route viability.",
      "Apply report insights immediately by reassigning ships or adjusting cargo focus.",
    ],
  },
  {
    title: "5. Manage wear, debt, and market saturation",
    summary:
      "Profit is not just about top-line revenue; it is about surviving the ugly little costs between turns.",
    bullets: [
      "Condition decays over time, and unreliable ships are more likely to break down.",
      "Loans can accelerate expansion, but weak routes turn debt into a liability.",
      "Repeatedly hammering the same market can saturate prices, so diversify before margins collapse.",
    ],
  },
  {
    title: "6. Finish strong before the campaign clock runs out",
    summary: `A standard run lasts ${MAX_TURNS} turns, so your late-game score reflects both expansion and discipline.`,
    bullets: [
      "Maintain a cash buffer to absorb adverse events without forced retrenchment.",
      "Upgrade only when the new ship unlocks better throughput, better route coverage, or both.",
      "Consistent late-game cash flow generally outperforms high-risk final-turn gambles.",
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
      "Stabilize one profitable route before opening additional lanes.",
      "Use the first report to compare freight and passenger contribution.",
    ],
  },
  {
    title: "How to read a market quickly",
    summary:
      "Think in pairs: where is something abundant, and where will people pay to see it arrive?",
    bullets: [
      "Export from planets whose identity naturally aligns with the cargo type.",
      "Import to planets whose profile shows demand for that cargo category.",
      "When margins fall, rotate cargo mix or destination before losses compound.",
    ],
  },
  {
    title: "When to buy more ships",
    summary:
      "Expansion works best once your current route book already proves there is demand for extra lift.",
    bullets: [
      "Expand when a newly purchased ship has an immediate profitable assignment.",
      "Delay purchases if maintenance and fuel are already squeezing your margin.",
      "Specialized hulls are strongest when their route purpose is obvious before you spend the money.",
    ],
  },
  {
    title: "How to recover from a bad quarter",
    summary: "The fix is usually operational clarity, not panic clicking.",
    bullets: [
      "Audit route-level performance first; weak lanes are often the primary cause.",
      "Reduce exposure to event-hit routes and re-establish stable core margins.",
      "Use debt only with a clear plan for earnings recovery.",
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is Star Freight Tycoon real-time?",
    answer:
      "No. It is a turn-driven management sim. You set plans, then the quarter resolves and reports results.",
  },
  {
    question: "What should I transport first?",
    answer:
      "Start with the clearest producer-to-consumer route in your opening region. Food, raw materials, and passengers are usually reliable early signals.",
  },
  {
    question: "Why did a good route stop paying well?",
    answer:
      "Typically due to saturation, trend shifts, fuel changes, or events. Rebalancing routes usually restores performance faster than repetition.",
  },
  {
    question: "Should I specialize or diversify?",
    answer:
      "Start focused, then diversify once your core loop is stable. Controlled expansion is safer than broad early experimentation.",
  },
  {
    question: "Can I play without reading the full manual?",
    answer:
      "Yes. The homepage includes a quick-start path and the help section covers common strategic decisions.",
  },
];

export const DISCLOSURE_CARDS: DisclosureCard[] = [
  {
    title: "AI-assisted music and visual materials",
    summary:
      "This project discloses where AI-assisted assets were used in music, concept work, or promotional visuals.",
    bullets: [
      "AI output is used as draft material and reviewed before inclusion.",
      "Assets may be revised or replaced as production quality improves.",
      "Disclosure is presented directly on the site for transparency.",
    ],
  },
  {
    title: "Human-authored game design and implementation",
    summary:
      "Core mechanics, systems code, balancing decisions, and final implementation remain developer-authored and curated.",
    bullets: [
      "Procedural generation, economy logic, scene flow, and simulation behavior are implemented in the game codebase.",
      "AI assistance does not replace testing, iteration, or creative direction.",
      "Site documentation reflects implemented gameplay systems rather than concept-only messaging.",
    ],
  },
  {
    title: "Why disclose it this clearly?",
    summary:
      "Clear production notes improve trust and make project provenance easier to understand.",
    bullets: [
      "Players can distinguish authored systems from assisted presentation assets.",
      "Version-to-version asset updates are easier to track.",
      "Transparent attribution supports long-term project credibility.",
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
