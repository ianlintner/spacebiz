import { EventCategory, CargoType } from "../../data/types.ts";
import type { EventEffect, EventChoice, ChoiceOption } from "../../data/types.ts";

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  duration: number;
  effects: EventEffect[];
  weight: number;
  headwindWeight: number;
  tailwindWeight: number;
  requiresChoice?: boolean;
  choices?: EventChoice[];
  /** Rich interactive choices for the new ChoiceEvent system */
  choiceOptions?: ChoiceOption[];
}

// ---------------------------------------------------------------------------
// Market Events (5)
// ---------------------------------------------------------------------------

const oreBoom: EventTemplate = {
  id: "ore_boom",
  name: "Ore Boom",
  description:
    "A surge in construction across the sector has driven raw materials demand up 50% on {target}.",
  category: EventCategory.Market,
  duration: 2,
  effects: [
    { type: "modifyDemand", cargoType: CargoType.RawMaterials, value: 0.5 },
  ],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const techGlut: EventTemplate = {
  id: "tech_glut",
  name: "Tech Glut",
  description:
    "Overproduction of technology goods has flooded the market, dropping tech prices by 30% galaxy-wide.",
  category: EventCategory.Market,
  duration: 2,
  effects: [
    { type: "modifyPrice", cargoType: CargoType.Technology, value: -0.3 },
  ],
  weight: 8,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const famineCrisis: EventTemplate = {
  id: "famine_crisis",
  name: "Famine Crisis",
  description:
    "Crop failures on {target} have driven food demand up 80%. Haulers needed urgently!",
  category: EventCategory.Market,
  duration: 3,
  effects: [{ type: "modifyDemand", cargoType: CargoType.Food, value: 0.8 }],
  weight: 8,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const tradeAgreement: EventTemplate = {
  id: "trade_agreement",
  name: "Trade Agreement",
  description:
    "A new interstellar trade pact has reduced fuel costs by 20% for all carriers. Do you commit resources to capitalize?",
  category: EventCategory.Market,
  duration: 2,
  effects: [{ type: "modifyPrice", value: -0.2 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 8,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "accept_alliance",
      label: "Accept the alliance — commit resources",
      outcomeDescription: "You commit resources and gain full trade benefits plus reputation.",
      effects: [
        { type: "modifyReputation", value: 5 },
        { type: "modifyCash", value: -3000 },
        { type: "modifyPrice", value: -0.1 },
      ],
      requiresCash: 3000,
    },
    {
      id: "conditional_terms",
      label: "Negotiate conditional terms",
      outcomeDescription: "You negotiate a limited commitment. Smaller benefit but more flexibility.",
      effects: [
        { type: "modifyReputation", value: 2 },
      ],
    },
    {
      id: "decline_agreement",
      label: "Decline the agreement",
      outcomeDescription: "You politely decline. No benefit, but no obligation either.",
      effects: [],
    },
  ],
};

const economicRecession: EventTemplate = {
  id: "economic_recession",
  name: "Economic Recession",
  description:
    "An economic downturn has reduced demand for all goods by 15% across the galaxy.",
  category: EventCategory.Market,
  duration: 3,
  effects: [{ type: "modifyDemand", value: -0.15 }],
  weight: 6,
  headwindWeight: 8,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Hazard Events (5)
// ---------------------------------------------------------------------------

const asteroidStorm: EventTemplate = {
  id: "asteroid_storm",
  name: "Asteroid Storm",
  description:
    "A dense asteroid field has made the route through {target} impassable for the time being.",
  category: EventCategory.Hazard,
  duration: 2,
  effects: [{ type: "blockRoute", value: 1 }],
  weight: 8,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const pirateActivity: EventTemplate = {
  id: "pirate_activity",
  name: "Pirate Activity",
  description:
    "Pirate raiders in the {target} system demand tribute. How do you respond?",
  category: EventCategory.Hazard,
  duration: 2,
  effects: [{ type: "modifySpeed", value: -0.2 }],
  weight: 7,
  headwindWeight: 8,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "pay_protection",
      label: "Pay protection money",
      outcomeDescription: "You pay the pirates. Routes continue unimpeded.",
      effects: [
        { type: "modifyCash", value: -2000 },
      ],
      requiresCash: 2000,
    },
    {
      id: "fight_pirates",
      label: "Fight back against the pirates",
      outcomeDescription: "You engage the pirates. 50% chance to rout them and gain reputation, 50% chance route stays blocked.",
      effects: [
        { type: "modifyReputation", value: 3 },
      ],
      requiresAp: 1,
    },
    {
      id: "detour_route",
      label: "Take a safe detour",
      outcomeDescription: "You route around the pirates. Revenue drops 15% but your ships stay safe.",
      effects: [
        { type: "modifyDemand", value: -0.15 },
      ],
    },
  ],
};

const solarFlare: EventTemplate = {
  id: "solar_flare",
  name: "Solar Flare",
  description:
    "Intense solar activity in the {target} system is disrupting navigation. How do you handle it?",
  category: EventCategory.Hazard,
  duration: 1,
  effects: [{ type: "modifySpeed", value: -0.3 }],
  weight: 9,
  headwindWeight: 0,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "hold_in_port",
      label: "Hold ships in port",
      outcomeDescription: "Ships sit out the storm. No revenue this turn but ships are safe.",
      effects: [
        { type: "modifyDemand", value: -1.0 },
      ],
    },
    {
      id: "push_through",
      label: "Push through the solar flare",
      outcomeDescription: "You brave the storm. Risk condition loss of 10-20 points.",
      effects: [
        { type: "modifySpeed", value: -0.1 },
      ],
    },
    {
      id: "alternate_route",
      label: "Take an alternate route",
      outcomeDescription: "Safer path costs 10% revenue but ships arrive intact.",
      effects: [
        { type: "modifyDemand", value: -0.1 },
      ],
    },
  ],
};

const quarantine: EventTemplate = {
  id: "quarantine",
  name: "Quarantine",
  description:
    "A disease outbreak on {target} has halted all passenger traffic to and from the planet.",
  category: EventCategory.Hazard,
  duration: 3,
  effects: [{ type: "blockPassengers", value: 1 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const fuelShortage: EventTemplate = {
  id: "fuel_shortage",
  name: "Fuel Shortage",
  description:
    "Supply chain disruptions have caused fuel prices to spike 40%. How do you respond?",
  category: EventCategory.Hazard,
  duration: 2,
  effects: [{ type: "modifyPrice", value: 0.4 }],
  weight: 7,
  headwindWeight: 8,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "buy_emergency_fuel",
      label: "Buy emergency fuel reserves",
      outcomeDescription: "You stock up at premium prices. Fleet keeps running smoothly.",
      effects: [
        { type: "modifyCash", value: -3000 },
        { type: "modifyPrice", value: -0.2 },
      ],
      requiresCash: 3000,
    },
    {
      id: "ground_routes",
      label: "Ground routes in affected system",
      outcomeDescription: "You ground your routes to save fuel. No revenue from grounded routes this turn.",
      effects: [
        { type: "modifyDemand", value: -0.5 },
      ],
    },
    {
      id: "divert_fuel_depot",
      label: "Divert to nearest fuel depot",
      outcomeDescription: "Ships take a detour to fuel up. 2-turn delay but cheaper fuel.",
      effects: [
        { type: "modifySpeed", value: -0.3 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Opportunity Events (5)
// ---------------------------------------------------------------------------

const emergencyTransport: EventTemplate = {
  id: "emergency_transport",
  name: "Emergency Transport",
  description:
    "An urgent delivery contract pays a flat bonus of $20,000 upon completion.",
  category: EventCategory.Opportunity,
  duration: 1,
  effects: [{ type: "modifyCash", value: 20000 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 8,
};

const derelictShip: EventTemplate = {
  id: "derelict_ship",
  name: "Derelict Ship",
  description:
    "A derelict cargo shuttle has been found drifting near {target}. What do you do with it?",
  category: EventCategory.Opportunity,
  duration: 1,
  effects: [],
  weight: 4,
  headwindWeight: 0,
  tailwindWeight: 4,
  requiresChoice: true,
  choices: [
    {
      label: "Salvage the ship",
      effects: [{ type: "modifyCash", value: 0 }],
    },
    {
      label: "Sell for scrap",
      effects: [{ type: "modifyCash", value: 5000 }],
    },
  ],
  choiceOptions: [
    {
      id: "salvage_ship",
      label: "Salvage the ship for parts",
      outcomeDescription: "You salvage the wreck and recover usable components.",
      effects: [
        { type: "modifyCash", value: 2000 },
        { type: "modifyReputation", value: 1 },
      ],
      requiresAp: 1,
    },
    {
      id: "sell_for_scrap",
      label: "Sell for scrap",
      outcomeDescription: "Quick sale for scrap value.",
      effects: [
        { type: "modifyCash", value: 5000 },
      ],
    },
    {
      id: "ignore_derelict",
      label: "Leave it and move on",
      outcomeDescription: "You ignore the derelict and focus on your routes.",
      effects: [],
    },
  ],
};

const governmentSubsidy: EventTemplate = {
  id: "government_subsidy",
  name: "Government Subsidy",
  description:
    "A government grant reduces your fleet maintenance costs by 50% for the next 2 turns.",
  category: EventCategory.Opportunity,
  duration: 2,
  effects: [{ type: "modifyPrice", value: -0.5 }],
  weight: 5,
  headwindWeight: 0,
  tailwindWeight: 8,
};

const newColony: EventTemplate = {
  id: "new_colony",
  name: "New Colony",
  description:
    "A new colony on {target} is generating fresh demand for supplies across all cargo types.",
  category: EventCategory.Opportunity,
  duration: 3,
  effects: [{ type: "modifyDemand", value: 0.4 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const celebrityPassenger: EventTemplate = {
  id: "celebrity_passenger",
  name: "Celebrity Passenger",
  description:
    "A celebrity wants to travel through {target}, doubling passenger revenue on routes to that planet.",
  category: EventCategory.Opportunity,
  duration: 1,
  effects: [
    {
      type: "modifyDemand",
      cargoType: CargoType.Passengers,
      value: 1.0,
    },
  ],
  weight: 7,
  headwindWeight: 0,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Flavor Events (5)
// ---------------------------------------------------------------------------

const alienAmbassador: EventTemplate = {
  id: "alien_ambassador",
  name: "Alien Ambassador",
  description:
    "An alien diplomatic envoy has praised your company's service, boosting your reputation by 5.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [{ type: "modifyReputation", value: 5 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const galacticFestival: EventTemplate = {
  id: "galactic_festival",
  name: "Galactic Festival",
  description:
    "The Annual Galactic Festival is underway! Fireworks and celebrations across the sector.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const scientificBreakthrough: EventTemplate = {
  id: "scientific_breakthrough",
  name: "Scientific Breakthrough",
  description:
    "Researchers have announced a major breakthrough in faster-than-light communication.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const holovidPremiere: EventTemplate = {
  id: "holovid_premiere",
  name: "Holovid Premiere",
  description:
    "The most anticipated holovid of the year premieres today, drawing crowds across the galaxy.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const historicalDiscovery: EventTemplate = {
  id: "historical_discovery",
  name: "Historical Discovery",
  description:
    "Archaeologists have uncovered ancient alien ruins, generating positive press for your sector. Reputation +3.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [{ type: "modifyReputation", value: 3 }],
  weight: 7,
  headwindWeight: 0,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Empire Events (5)
// ---------------------------------------------------------------------------

const empireTradePact: EventTemplate = {
  id: "empire_trade_pact",
  name: "Empire Trade Pact",
  description:
    "A neighboring empire has signed a trade agreement, reducing tariffs on cross-border routes by 50% for 3 turns.",
  category: EventCategory.Empire,
  duration: 3,
  effects: [{ type: "modifyPrice", value: -0.5 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 6,
};

const borderDispute: EventTemplate = {
  id: "border_dispute",
  name: "Border Dispute",
  description:
    "Tensions between empires have doubled tariff costs on all cross-border routes for 2 turns.",
  category: EventCategory.Empire,
  duration: 2,
  effects: [{ type: "modifyPrice", value: 1.0 }],
  weight: 7,
  headwindWeight: 6,
  tailwindWeight: 0,
};

const empireEmbargo: EventTemplate = {
  id: "empire_embargo",
  name: "Empire Embargo",
  description:
    "A hostile empire has imposed an embargo, blocking all routes crossing into their territory. How do you respond?",
  category: EventCategory.Empire,
  duration: 2,
  effects: [{ type: "blockRoute", value: 1 }],
  weight: 4,
  headwindWeight: 8,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "comply_embargo",
      label: "Comply — suspend the blocked route",
      outcomeDescription: "You comply with the embargo. Route suspended, reputation preserved.",
      effects: [
        { type: "modifyReputation", value: 2 },
        { type: "modifyCash", value: -1000 },
      ],
    },
    {
      id: "resist_embargo",
      label: "Resist — keep routes running at risk",
      outcomeDescription: "You defy the embargo. Routes stay open but you risk reputation damage.",
      effects: [
        { type: "modifyReputation", value: -5 },
      ],
    },
    {
      id: "negotiate_embargo",
      label: "Negotiate a partial exemption",
      outcomeDescription: "You pay to negotiate a reduced penalty. Partial route access maintained.",
      effects: [
        { type: "modifyCash", value: -2000 },
        { type: "modifyReputation", value: -1 },
      ],
      requiresCash: 2000,
    },
  ],
};

const empireSubsidy: EventTemplate = {
  id: "empire_subsidy",
  name: "Empire Subsidy",
  description:
    "Your home empire is subsidizing freight operations — receive a $15,000 government bonus!",
  category: EventCategory.Empire,
  duration: 1,
  effects: [{ type: "modifyCash", value: 15000 }],
  weight: 5,
  headwindWeight: 0,
  tailwindWeight: 6,
};

const pirateCorridors: EventTemplate = {
  id: "pirate_corridors",
  name: "Pirate Corridors",
  description:
    "Pirates have established smuggling corridors in the border regions, reducing ship speed by 25% on cross-border routes.",
  category: EventCategory.Empire,
  duration: 2,
  effects: [{ type: "modifySpeed", value: -0.25 }],
  weight: 6,
  headwindWeight: 4,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Phase 3 — Empire Trade Policy Events (5)
// ---------------------------------------------------------------------------

const tradeEmbargo: EventTemplate = {
  id: "trade_embargo",
  name: "Trade Embargo",
  description:
    "A diplomatic crisis between {target} has grounded all routes between the two empires! What is your strategy?",
  category: EventCategory.Empire,
  duration: 3,
  effects: [{ type: "groundEmpireRoutes", value: 1 }],
  weight: 4,
  headwindWeight: 8,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "accept_embargo",
      label: "Accept the embargo — comply fully",
      outcomeDescription: "You comply. Routes grounded, but reputation with both empires stays neutral.",
      effects: [
        { type: "modifyReputation", value: 1 },
      ],
    },
    {
      id: "resist_trade_embargo",
      label: "Resist — keep running cross-empire routes",
      outcomeDescription: "You defy the embargo. Risk reputation damage but keep revenue.",
      effects: [
        { type: "modifyReputation", value: -5 },
        { type: "modifyCash", value: 3000 },
      ],
    },
    {
      id: "reroute_around_embargo",
      label: "Reroute through neutral territory",
      outcomeDescription: "Longer routes but you avoid the embargo zone entirely.",
      effects: [
        { type: "modifySpeed", value: -0.2 },
      ],
    },
  ],
};

const importCrackdown: EventTemplate = {
  id: "import_crackdown",
  name: "Import Crackdown",
  description:
    "The {target} empire has enacted emergency import restrictions. Certain goods are temporarily banned!",
  category: EventCategory.Empire,
  duration: 4,
  effects: [{ type: "blockImport", value: 1 }],
  weight: 5,
  headwindWeight: 6,
  tailwindWeight: 0,
};

const freeTradeSummit: EventTemplate = {
  id: "free_trade_summit",
  name: "Free Trade Summit",
  description:
    "A historic trade summit has convinced {target} to temporarily lift all trade bans!",
  category: EventCategory.Empire,
  duration: 2,
  effects: [{ type: "removeBans", value: 1 }],
  weight: 4,
  headwindWeight: 0,
  tailwindWeight: 8,
};

const tariffWar: EventTemplate = {
  id: "tariff_war",
  name: "Tariff War",
  description:
    "A tariff war has erupted between {target}! Cross-border tariffs doubled for both empires.",
  category: EventCategory.Empire,
  duration: 4,
  effects: [{ type: "modifyTariff", value: 1.0 }],
  weight: 5,
  headwindWeight: 6,
  tailwindWeight: 0,
};

const smugglingOpportunity: EventTemplate = {
  id: "smuggling_opportunity",
  name: "Smuggling Opportunity",
  description:
    "Black market contacts in {target} are offering 3× price for banned imports. Risky but lucrative!",
  category: EventCategory.Empire,
  duration: 1,
  effects: [],
  weight: 3,
  headwindWeight: 0,
  tailwindWeight: 4,
  requiresChoice: true,
  choices: [
    {
      label: "Attempt smuggling run",
      effects: [
        { type: "modifyCash", value: 25000 },
        { type: "modifyReputation", value: -10 },
      ],
    },
    {
      label: "Play it safe",
      effects: [],
    },
  ],
  choiceOptions: [
    {
      id: "attempt_smuggling",
      label: "Attempt the smuggling run",
      outcomeDescription: "High risk, high reward. Big cash but reputation takes a hit.",
      effects: [
        { type: "modifyCash", value: 25000 },
        { type: "modifyReputation", value: -10 },
      ],
    },
    {
      id: "report_smuggling",
      label: "Report the ring to authorities",
      outcomeDescription: "You tip off the empire. Reputation boost, small cash reward.",
      effects: [
        { type: "modifyReputation", value: 8 },
        { type: "modifyCash", value: 2000 },
      ],
    },
    {
      id: "ignore_smuggling",
      label: "Play it safe — ignore the offer",
      outcomeDescription: "You decline. No risk, no reward.",
      effects: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Phase 4 — Diplomacy & Hyperlane Events (6)
// ---------------------------------------------------------------------------

const warDeclaration: EventTemplate = {
  id: "war_declaration",
  name: "War Declaration",
  description:
    "Hostilities have erupted between {target}! All border ports between the warring empires are now closed. How do you respond?",
  category: EventCategory.Empire,
  duration: 4,
  effects: [{ type: "declareWar", value: 1 }],
  weight: 3,
  headwindWeight: 10,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "pick_side_war",
      label: "Align with one empire",
      outcomeDescription: "You back one side. If they win you gain major bonuses; if they lose, penalties.",
      effects: [
        { type: "modifyReputation", value: 5 },
        { type: "modifyCash", value: 10000 },
      ],
      requiresReputation: 40,
    },
    {
      id: "stay_neutral_war",
      label: "Stay neutral",
      outcomeDescription: "You stay out of it. Small penalty from both empires but routes stay accessible.",
      effects: [
        { type: "modifyReputation", value: -3 },
      ],
    },
    {
      id: "mediate_war",
      label: "Attempt mediation",
      outcomeDescription: "You spend resources to broker peace. Expensive but could prevent prolonged disruption.",
      effects: [
        { type: "modifyCash", value: -5000 },
        { type: "modifyReputation", value: 10 },
      ],
      requiresCash: 5000,
    },
  ],
};

const peaceTreaty: EventTemplate = {
  id: "peace_treaty",
  name: "Peace Treaty",
  description:
    "After prolonged tensions, {target} have signed a peace treaty. Border ports are reopening! Will you invest in renewed trade?",
  category: EventCategory.Empire,
  duration: 1,
  effects: [{ type: "signPeace", value: 1 }],
  weight: 4,
  headwindWeight: 0,
  tailwindWeight: 8,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "invest_peace",
      label: "Invest in post-war trade corridors",
      outcomeDescription: "You spend cash to set up new routes early, gaining first-mover advantage.",
      effects: [
        { type: "modifyCash", value: -3000 },
        { type: "modifyReputation", value: 5 },
        { type: "modifyDemand", value: 0.2 },
      ],
      requiresCash: 3000,
    },
    {
      id: "wait_and_see_peace",
      label: "Wait and see how things develop",
      outcomeDescription: "You take a cautious approach. No investment, but routes stay open.",
      effects: [],
    },
  ],
};

const diplomaticIncident: EventTemplate = {
  id: "diplomatic_incident",
  name: "Diplomatic Incident",
  description:
    "A border skirmish near {target} has strained relations between neighboring empires. Trade may be disrupted.",
  category: EventCategory.Empire,
  duration: 2,
  effects: [{ type: "degradeRelation", value: 1 }],
  weight: 6,
  headwindWeight: 5,
  tailwindWeight: 0,
};

const allianceFormed: EventTemplate = {
  id: "alliance_formed",
  name: "Alliance Formed",
  description:
    "A historic alliance has been signed between {target}! Borders fully open and all tariffs eliminated. Do you leverage this?",
  category: EventCategory.Empire,
  duration: 1,
  effects: [{ type: "formAlliance", value: 1 }],
  weight: 2,
  headwindWeight: 0,
  tailwindWeight: 10,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "leverage_alliance",
      label: "Commit resources to maximize alliance benefits",
      outcomeDescription: "You invest in this opportunity and see amplified gains across allied routes.",
      effects: [
        { type: "modifyCash", value: -2000 },
        { type: "modifyReputation", value: 8 },
        { type: "modifyDemand", value: 0.3 },
      ],
      requiresCash: 2000,
    },
    {
      id: "passive_alliance",
      label: "Passively benefit from the alliance",
      outcomeDescription: "You enjoy the natural benefits without extra commitment.",
      effects: [
        { type: "modifyReputation", value: 2 },
      ],
    },
  ],
};

const tradePactSigned: EventTemplate = {
  id: "trade_pact_signed",
  name: "Trade Pact Signed",
  description:
    "A trade pact has been established between {target}. Tariffs halved and all border ports opened!",
  category: EventCategory.Empire,
  duration: 1,
  effects: [{ type: "formTradePact", value: 1 }],
  weight: 4,
  headwindWeight: 0,
  tailwindWeight: 6,
};

const borderClosure: EventTemplate = {
  id: "border_closure",
  name: "Border Closure",
  description:
    "Rising tensions have led {target} to close their borders entirely. Routes through their territory are blocked! What is your plan?",
  category: EventCategory.Empire,
  duration: 3,
  effects: [{ type: "closeBorders", value: 1 }],
  weight: 4,
  headwindWeight: 8,
  tailwindWeight: 0,
  requiresChoice: true,
  choiceOptions: [
    {
      id: "flee_border_closure",
      label: "Immediately reroute all affected ships",
      outcomeDescription: "You pull out quickly. Revenue drops but ships stay safe.",
      effects: [
        { type: "modifyDemand", value: -0.2 },
      ],
    },
    {
      id: "fight_border_closure",
      label: "Challenge the closure diplomatically",
      outcomeDescription: "You file a formal protest. Small chance to reverse closure, costs reputation if it fails.",
      effects: [
        { type: "modifyCash", value: -1500 },
        { type: "modifyReputation", value: -2 },
      ],
      requiresCash: 1500,
    },
    {
      id: "mediate_border_closure",
      label: "Offer to mediate between the empires",
      outcomeDescription: "You invest in diplomacy. Expensive but builds reputation and may reopen borders faster.",
      effects: [
        { type: "modifyCash", value: -4000 },
        { type: "modifyReputation", value: 8 },
      ],
      requiresCash: 4000,
    },
  ],
};

// ---------------------------------------------------------------------------
// All templates exported as an array
// ---------------------------------------------------------------------------

export const EVENT_TEMPLATES: EventTemplate[] = [
  // Market
  oreBoom,
  techGlut,
  famineCrisis,
  tradeAgreement,
  economicRecession,
  // Hazard
  asteroidStorm,
  pirateActivity,
  solarFlare,
  quarantine,
  fuelShortage,
  // Opportunity
  emergencyTransport,
  derelictShip,
  governmentSubsidy,
  newColony,
  celebrityPassenger,
  // Flavor
  alienAmbassador,
  galacticFestival,
  scientificBreakthrough,
  holovidPremiere,
  historicalDiscovery,
  // Empire
  empireTradePact,
  borderDispute,
  empireEmbargo,
  empireSubsidy,
  pirateCorridors,
  // Phase 3 — Empire Trade Policy Events
  tradeEmbargo,
  importCrackdown,
  freeTradeSummit,
  tariffWar,
  smugglingOpportunity,
  // Phase 4 — Diplomacy & Hyperlane Events
  warDeclaration,
  peaceTreaty,
  diplomaticIncident,
  allianceFormed,
  tradePactSigned,
  borderClosure,
];
