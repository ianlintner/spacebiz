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
  [PlanetType.Agricultural]: "Agricultural",
  [PlanetType.Mining]: "Mining",
  [PlanetType.TechWorld]: "Tech World",
  [PlanetType.Manufacturing]: "Manufacturing",
  [PlanetType.LuxuryWorld]: "Luxury World",
  [PlanetType.CoreWorld]: "Core World",
  [PlanetType.Frontier]: "Frontier",
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
    label: "Seed Capital",
    value: formatCurrency(STARTING_CASH),
    detail:
      "Your treasury at launch. Every credit gets spent or invested — the galaxy doesn't run on hope.",
  },
  {
    label: "Mission Length",
    value: `${MAX_TURNS} quarters`,
    detail:
      "A fixed-length run. Survive the clock and your ledger writes the ending.",
  },
  {
    label: "Starting Hangar",
    value: STARTER_SHIPS.map((ship) => ship.name).join(" + "),
    detail:
      "Two reliable hulls to launch the first lanes. You'll outgrow them — that's the point.",
  },
];

export const FEATURE_CARDS: FeatureCard[] = [
  {
    eyebrow: "GALACTIC TRADE",
    title: "From local hauler to sector-wide hauler-of-haulers",
    body: "Stitch together routes, assign hulls, and watch the network compound. Every lane is a tiny business; together they're an empire.",
  },
  {
    eyebrow: "DYNAMIC ECONOMY",
    title: "Supply, demand, and the cold math of saturation",
    body: "Planet profiles produce what they have and crave what they lack. Find a mismatch, point a ship at it, and ride the spread until the market catches on.",
  },
  {
    eyebrow: "QUARTERLY SIMULATION",
    title: "Set the orders, hit End Quarter, watch it play",
    body: "Every turn cashes out trips, fuel, maintenance, contracts, and events into one tidy P&L. The report tells you exactly which lanes are heroes and which are loafing.",
  },
  {
    eyebrow: "RIVAL EMPIRES",
    title: "AI competitors with names, faces, and fleets of their own",
    body: "Empires expand alongside you, claim systems, and sometimes drag you into a mid-quarter dilemma. Stay sharp — the galaxy is not just an economy puzzle.",
  },
];

export const MANUAL_SECTIONS: GuideSection[] = [
  {
    title: "1. Pick your first foothold",
    summary:
      "Each new run rolls a procedural galaxy and offers a small slate of opening systems. Where you plant the flag shapes the next ten quarters.",
    bullets: [
      `Day one: ${formatCurrency(STARTING_CASH)} in the bank and ${STARTER_SHIPS.length} hulls in the hangar — make them count.`,
      "Look for systems with two or three different planet types within a short hop. Variety is leverage.",
      "Spend the first quarter or two confirming demand. Don't fall in love with a route until the report agrees with you.",
    ],
  },
  {
    title: "2. Read the galaxy like a trader",
    summary:
      "Profit is a sentence with two halves: where something is cheap, and where someone will pay for it. Your job is matching them.",
    bullets: [
      "Mining worlds spit out raw materials and the occasional drum of hazmat. Move it before the locals do.",
      "Agricultural belts are food factories — predictable, low-drama, often the backbone of an early book.",
      "Industrial, Terran, Hub, Research, and Resort worlds are the buyers. They'll take what you bring if the price is right.",
    ],
  },
  {
    title: "3. Right hull, right lane",
    summary:
      "Every ship class has a sweet spot. The art is matching tonnage and speed to what the route actually wants — not what looks coolest in the hangar.",
    bullets: [
      "Cargo Shuttles are the workhorses of the early book — cheap to operate, easy to replace.",
      "Passenger Shuttles thrive on dense population corridors where speed beats volume.",
      "Big haulers need big lanes. Don't park a freighter on a route that can't fill it.",
    ],
  },
  {
    title: "4. End the quarter, read the ledger",
    summary:
      "When the orders are in, hit End Quarter. Trips fly, fuel burns, events fire, and the report drops on your desk. Read it.",
    bullets: [
      "The lane-by-lane breakdown is your scoreboard. Weak performers stand out fast.",
      "Watch fuel and event modifiers — a quarter of cheap fuel can mask a route that's about to crater.",
      "React the same turn. Reassign ships, swap cargo, kill a dead lane. Don't wait three quarters to admit something isn't working.",
    ],
  },
  {
    title: "5. Wear, debt, and the limits of a good market",
    summary:
      "Top-line revenue is loud; the costs that bury you are quiet. Reliability, interest, and market saturation are the silent killers.",
    bullets: [
      "Hulls wear down. Skip maintenance long enough and they break down on the worst possible quarter.",
      "Loans buy speed — sometimes worth it, often not. A weak route plus debt is a story that ends in bankruptcy.",
      "Hammer the same lane forever and prices fall. Diversify before margins do.",
    ],
  },
  {
    title: "6. Stick the landing",
    summary: `A campaign runs ${MAX_TURNS} quarters. Late-game scores reward operators who balance expansion with discipline.`,
    bullets: [
      "Keep a cash cushion. The final stretch is when bad events love to show up.",
      "Upgrade only when a new hull unlocks throughput or coverage you're already short on.",
      "Boring, steady cash flow beats Hail-Mary speculation almost every time. Almost.",
    ],
  },
];

export const HELP_TOPICS: GuideSection[] = [
  {
    title: "Rookie checklist",
    summary:
      "Brand new? Skip the existential questions and run this sequence. It gets you to competent in two or three quarters.",
    bullets: [
      "Pick an opening with at least one obvious producer and one obvious buyer within a hop.",
      "Get one route printing money before you open a second. Confirmed beats theoretical.",
      "Read the first report end-to-end. Freight and passengers play different games — find out which one your start prefers.",
    ],
  },
  {
    title: "Reading a market in 30 seconds",
    summary:
      "Think in pairs. Where is the stuff cheap and plentiful, and where will somebody pay to see it arrive? That's the whole sport.",
    bullets: [
      "Export from worlds whose profile screams 'we have too much of this.'",
      "Import to worlds whose profile says 'we need this and we'll pay.'",
      "When a margin starts shrinking, rotate cargo or destination before it bleeds out.",
    ],
  },
  {
    title: "When to actually buy a ship",
    summary:
      "More hulls feel like progress. They're a liability until they have a job. Don't buy without a lane in mind.",
    bullets: [
      "Buy when there's a profitable assignment ready on day one.",
      "Hold off if fuel and maintenance are already chewing through margin.",
      "Specialty hulls (high speed, high tonnage, passenger-focused) shine when the route's purpose is already obvious.",
    ],
  },
  {
    title: "Pulling out of a tailspin",
    summary:
      "Bad quarters happen. The fix is almost never panic-clicking — it's a quiet hour with the route report.",
    bullets: [
      "Sort lanes by margin. The bottom three are usually the story.",
      "Mothball or repath routes that just got hit by a bad event. Don't pretend it didn't happen.",
      "Borrow only with a written plan for how earnings come back. 'I'll figure it out' is not a plan.",
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is this real-time?",
    answer:
      "No. It's a turn-driven management sim. You set the plan, hit End Quarter, and the simulation plays out. Plenty of time to think between moves — exactly like the classics.",
  },
  {
    question: "What should I haul first?",
    answer:
      "Whatever the local map screams loudest about. Food, raw materials, and passengers are the most reliable early signals. The first quarter is for confirming the obvious — not chasing the exotic.",
  },
  {
    question: "My route used to print money. Why's it dying?",
    answer:
      "Usually saturation, a trend shift, a fuel spike, or an event. The fix is almost always rebalancing — new cargo, new destination, or both. Repetition without diagnosis just digs the hole deeper.",
  },
  {
    question: "Specialize or diversify?",
    answer:
      "Specialize first. Get one or two routes humming. Diversify once your core loop is stable and you have cash to absorb a misfire. Spreading thin early just turns into a dozen unprofitable lanes.",
  },
  {
    question: "Do I need to read the manual?",
    answer:
      "Nope. The homepage has a quick-start, the in-game help is short, and the report after every quarter is honestly the best teacher in the game. The manual is here when you want it, not because you have to.",
  },
];

export const DISCLOSURE_CARDS: DisclosureCard[] = [
  {
    title: "AI-assisted art, music, and concept work",
    summary:
      "Some visuals, soundscapes, and concept frames started as AI output. We say so on the box because it's the right thing to do.",
    bullets: [
      "AI output is treated as draft material — reviewed, edited, often replaced.",
      "Assets get upgraded as production quality improves; this isn't the final cover art.",
      "Disclosure lives on the site itself so nothing's hiding behind a marketing page.",
    ],
  },
  {
    title: "Game design and code: written by hand",
    summary:
      "Mechanics, simulation, balance, and the way scenes click together are developer-authored. AI helps; it doesn't drive.",
    bullets: [
      "Procedural galaxies, economy math, scene flow, and turn resolution are implemented in the codebase — not summoned from a prompt.",
      "Assistance accelerates work; it doesn't replace testing, iteration, or creative direction.",
      "Documentation describes systems that actually exist — no vaporware bullet points.",
    ],
  },
  {
    title: "Why the receipts?",
    summary:
      "Indie studios used to print credits on the back of the cartridge. This is the 2026 version of that — minus the cartridge.",
    bullets: [
      "Players deserve to know which parts are authored and which were assisted.",
      "Version-over-version asset updates stay legible over time.",
      "Transparency is a feature. So is being able to point at the source code.",
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
    "Use this as a starting heuristic — then trust the live market screen over the cheat sheet.",
  ],
}));

export const CARGO_CHEAT_SHEET: CheatSheetCard[] = Object.entries(
  BASE_CARGO_PRICES,
).map(([cargoType, price]) => ({
  title: labelFor(cargoType),
  caption: `Base market price: ${formatCurrency(price)}`,
  bullets: [
    "Real returns swing with supply, demand, saturation, and event modifiers — base price is just the starting line.",
    "Always pair origin abundance with destination demand. One without the other is a hobby, not a business.",
    cargoType === CargoType.Passengers
      ? "Passengers care about seats, not tonnage — match the hull to the lane."
      : "Volume vs. operating cost is the whole equation. Don't haul air.",
  ],
}));
