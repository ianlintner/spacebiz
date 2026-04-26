import type {
  EventChainId,
  ChoiceOption,
  GameState,
} from "../../data/types.ts";

// ---------------------------------------------------------------------------
// EventChainStep — one step in a multi-step chain event
// ---------------------------------------------------------------------------

export interface EventChainStep {
  /** 0-based index in the chain */
  stepIndex: number;
  /** Optional reference to an EventDefinitions event id (for reference/flavor) */
  eventId?: string;
  /** Prompt displayed to the player */
  prompt: string;
  /** Interactive choices for this step */
  options: ChoiceOption[];
  /** How many turns after the previous step before this step fires */
  delayTurns: number;
}

// ---------------------------------------------------------------------------
// EventChainDefinition — a full chain of sequential events
// ---------------------------------------------------------------------------

export interface EventChainDefinition {
  chainId: EventChainId;
  name: string;
  description: string;
  steps: EventChainStep[];
  /** Returns true when this chain's trigger conditions are met */
  triggerCondition: (state: GameState) => boolean;
}

// ---------------------------------------------------------------------------
// Chain 1: Pirate Campaign (4 steps)
// Triggers: turn >= 5 and no active chains
// ---------------------------------------------------------------------------

const pirateCampaign: EventChainDefinition = {
  chainId: "pirate_campaign",
  name: "Pirate Campaign",
  description:
    "A coordinated pirate offensive is threatening your shipping lanes. How you respond will shape the outcome.",
  triggerCondition: (state: GameState): boolean => {
    return state.turn >= 5 && state.activeEventChains.length === 0;
  },
  steps: [
    {
      stepIndex: 0,
      eventId: "pirate_activity",
      prompt:
        "Pirate scouts have been spotted near your primary trade routes. Your captains report suspicious vessels shadowing your convoys. How do you respond?",
      delayTurns: 0,
      options: [
        {
          id: "flee_scouts",
          label: "Reroute ships away from scout activity",
          outcomeDescription:
            "You play it safe and reroute. Revenue dips slightly but pirates lose track of your ships.",
          effects: [
            { type: "modifyDemand", value: -0.1 },
            { type: "modifyReputation", value: 1 },
          ],
        },
        {
          id: "fortify_routes",
          label: "Hire extra security escorts",
          outcomeDescription:
            "You pay for armed escorts. Expensive, but it sends a message to the pirates.",
          effects: [
            { type: "modifyCash", value: -3000 },
            { type: "modifyReputation", value: 3 },
          ],
          requiresCash: 3000,
        },
        {
          id: "hire_escort",
          label: "Alert the authorities and continue",
          outcomeDescription:
            "You report the scouts and keep running. Authorities may or may not respond in time.",
          effects: [{ type: "modifyReputation", value: 2 }],
          requiresAp: 1,
        },
      ],
    },
    {
      stepIndex: 1,
      eventId: "pirate_activity",
      prompt:
        "The pirates have escalated — a full convoy attack is underway! Your freighter convoy has been intercepted. What is your captain's order?",
      delayTurns: 3,
      options: [
        {
          id: "pay_ransom",
          label: "Pay the ransom to secure the convoy",
          outcomeDescription:
            "You pay off the pirates. Convoy is released intact but you've emboldened them.",
          effects: [
            { type: "modifyCash", value: -8000 },
            { type: "modifyReputation", value: -2 },
          ],
          requiresCash: 8000,
        },
        {
          id: "fight_convoy",
          label: "Order the convoy to fight back",
          outcomeDescription:
            "Your armed escort engages the pirates. Win or lose, word spreads that you don't go quietly.",
          effects: [
            { type: "modifyReputation", value: 5 },
            { type: "modifyCash", value: -2000 },
          ],
        },
        {
          id: "scatter_convoy",
          label: "Scatter and run — every ship for itself",
          outcomeDescription:
            "Ships scatter in all directions. Some escape, some are captured. Mixed results.",
          effects: [
            { type: "modifyCash", value: -4000 },
            { type: "modifyDemand", value: -0.2 },
          ],
        },
      ],
    },
    {
      stepIndex: 2,
      prompt:
        "Intelligence has located the pirate base! A fortified station at the edge of the system is coordinating all the raids. Do you act?",
      delayTurns: 2,
      options: [
        {
          id: "raid_base",
          label: "Fund a mercenary raid on the base",
          outcomeDescription:
            "You hire mercs to assault the base. Costly, but if successful it ends the pirate threat for good.",
          effects: [
            { type: "modifyCash", value: -12000 },
            { type: "modifyReputation", value: 10 },
          ],
          requiresCash: 12000,
        },
        {
          id: "report_base",
          label: "Report the base to the nearest empire",
          outcomeDescription:
            "You hand over the intelligence. The empire acts (eventually). Reputation up, no cost.",
          effects: [{ type: "modifyReputation", value: 6 }],
          requiresAp: 1,
        },
        {
          id: "ignore_base",
          label: "Ignore it and hope the pirates move on",
          outcomeDescription:
            "You do nothing. The base stays active — expect more trouble next turn.",
          effects: [{ type: "modifyReputation", value: -2 }],
        },
      ],
    },
    {
      stepIndex: 3,
      prompt:
        "The pirate campaign has reached its conclusion. Based on your choices, the sector is either safer or more dangerous than before.",
      delayTurns: 2,
      options: [
        {
          id: "claim_victory",
          label: "Declare victory and advertise your resilience",
          outcomeDescription:
            "You turn the experience into a PR opportunity. Reputation surges.",
          effects: [
            { type: "modifyReputation", value: 8 },
            { type: "modifyCash", value: 2000 },
          ],
        },
        {
          id: "quietly_rebuild",
          label: "Quietly rebuild and move on",
          outcomeDescription:
            "You keep a low profile and focus on recovery. Steady income resumes.",
          effects: [{ type: "modifyDemand", value: 0.1 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 2: Diplomatic Crisis (3 steps)
// Triggers: turn >= 8 and a diplomaticRelations entry exists
// ---------------------------------------------------------------------------

const diplomaticCrisis: EventChainDefinition = {
  chainId: "diplomatic_crisis",
  name: "Diplomatic Crisis",
  description:
    "A brewing diplomatic incident between two major empires threatens to destabilize trade across the sector.",
  triggerCondition: (state: GameState): boolean => {
    return (
      state.turn >= 8 &&
      state.activeEventChains.length === 0 &&
      (state.diplomaticRelations?.length ?? 0) > 0
    );
  },
  steps: [
    {
      stepIndex: 0,
      prompt:
        "A diplomatic incident has occurred between two rival empires. Ambassadors have been recalled and trade is under threat. How does your company position itself?",
      delayTurns: 0,
      options: [
        {
          id: "mediate_crisis",
          label: "Offer to mediate as a neutral trade partner",
          outcomeDescription:
            "You put your company forward as a neutral broker. Expensive but builds significant reputation.",
          effects: [
            { type: "modifyCash", value: -4000 },
            { type: "modifyReputation", value: 8 },
          ],
          requiresCash: 4000,
        },
        {
          id: "choose_side_crisis",
          label: "Align with the stronger empire",
          outcomeDescription:
            "You back the dominant power. If they prevail, you gain preferential access to their routes.",
          effects: [
            { type: "modifyReputation", value: 4 },
            { type: "modifyCash", value: 5000 },
          ],
          requiresReputation: 30,
        },
        {
          id: "ignore_crisis",
          label: "Stay out of it entirely",
          outcomeDescription:
            "You avoid taking sides. Both empires are mildly annoyed but you face no immediate penalty.",
          effects: [{ type: "modifyReputation", value: -1 }],
        },
      ],
    },
    {
      stepIndex: 1,
      prompt:
        "The crisis is escalating. Trade routes between the two empires are being disrupted and your revenue is suffering. Tensions may boil over into open conflict.",
      delayTurns: 2,
      options: [
        {
          id: "emergency_diplomacy",
          label: "Fund emergency diplomatic summit",
          outcomeDescription:
            "You spend heavily to bring both sides to the table. May prevent war but very expensive.",
          effects: [
            { type: "modifyCash", value: -8000 },
            { type: "modifyReputation", value: 12 },
          ],
          requiresCash: 8000,
        },
        {
          id: "exploit_disruption",
          label: "Exploit the disruption — corner the neutral market",
          outcomeDescription:
            "With other traders fleeing, you move in. High risk but high reward.",
          effects: [
            { type: "modifyCash", value: 7000 },
            { type: "modifyReputation", value: -3 },
          ],
        },
        {
          id: "wait_crisis_out",
          label: "Wait it out and protect existing routes",
          outcomeDescription:
            "You hunker down and protect what you have. Safe choice.",
          effects: [{ type: "modifyDemand", value: -0.15 }],
        },
      ],
    },
    {
      stepIndex: 2,
      prompt:
        "The crisis reaches its conclusion. Depending on your choices and luck, the empires have either declared war or signed a fragile peace.",
      delayTurns: 2,
      options: [
        {
          id: "leverage_resolution",
          label: "Leverage your role in the resolution",
          outcomeDescription:
            "You capitalize on whatever reputation you've built to secure favorable trade terms.",
          effects: [
            { type: "modifyReputation", value: 5 },
            { type: "modifyDemand", value: 0.15 },
          ],
          requiresReputation: 45,
        },
        {
          id: "accept_new_order",
          label: "Accept the new political order and adapt",
          outcomeDescription:
            "You adjust your routes to the new reality. Modest but steady recovery.",
          effects: [{ type: "modifyDemand", value: 0.1 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 3: Plague (3 steps)
// Triggers: turn >= 6
// ---------------------------------------------------------------------------

const plague: EventChainDefinition = {
  chainId: "plague",
  name: "Plague Outbreak",
  description:
    "A dangerous contagion is spreading through the sector. Your decisions about quarantine and aid could save lives — or your business.",
  triggerCondition: (state: GameState): boolean => {
    return state.turn >= 6 && state.activeEventChains.length === 0;
  },
  steps: [
    {
      stepIndex: 0,
      prompt:
        "Sickness has been reported at a major destination planet. Medical authorities are urging precautions. What is your company's response?",
      delayTurns: 0,
      options: [
        {
          id: "quarantine_routes",
          label: "Voluntarily quarantine affected routes",
          outcomeDescription:
            "You halt traffic to infected areas. Revenue takes a hit but your reputation for safety soars.",
          effects: [
            { type: "modifyDemand", value: -0.3 },
            { type: "modifyReputation", value: 8 },
          ],
        },
        {
          id: "continue_routes",
          label: "Continue routes — the risk is overstated",
          outcomeDescription:
            "You keep running. Revenue maintained but you may be spreading the disease.",
          effects: [
            { type: "modifyReputation", value: -3 },
            { type: "modifyCash", value: 4000 },
          ],
        },
        {
          id: "send_aid",
          label: "Send medical supply aid to the planet",
          outcomeDescription:
            "You divert a cargo ship to deliver medical supplies. Costs money but major reputation gain.",
          effects: [
            { type: "modifyCash", value: -5000 },
            { type: "modifyReputation", value: 12 },
          ],
          requiresCash: 5000,
        },
      ],
    },
    {
      stepIndex: 1,
      prompt:
        "The plague has spread to neighboring systems. Three planets are now under quarantine. Your medical cargo routes are in high demand.",
      delayTurns: 2,
      options: [
        {
          id: "reroute_medical_cargo",
          label: "Prioritize medical cargo — switch routes to aid delivery",
          outcomeDescription:
            "You pivot to medical transport. Revenue improves and reputation gets a major boost.",
          effects: [
            { type: "modifyDemand", cargoType: "medical", value: 0.8 },
            { type: "modifyReputation", value: 6 },
          ],
          requiresAp: 1,
        },
        {
          id: "price_gouge_plague",
          label: "Raise prices — capitalize on desperate demand",
          outcomeDescription:
            "You raise cargo prices significantly. Revenue spikes but reputation craters.",
          effects: [
            { type: "modifyCash", value: 12000 },
            { type: "modifyReputation", value: -12 },
          ],
        },
        {
          id: "maintain_current_plague",
          label: "Maintain current routes and wait",
          outcomeDescription:
            "You hold steady. Some revenue loss as quarantines bite.",
          effects: [{ type: "modifyDemand", value: -0.2 }],
        },
      ],
    },
    {
      stepIndex: 2,
      prompt:
        "The plague is finally under control. Quarantines are lifting and normal trade is resuming. How do you capitalize on the recovery?",
      delayTurns: 3,
      options: [
        {
          id: "invest_recovery",
          label: "Invest heavily in post-plague reconstruction routes",
          outcomeDescription:
            "You position yourself at the forefront of recovery trade. Significant gains.",
          effects: [
            { type: "modifyCash", value: -5000 },
            { type: "modifyDemand", value: 0.4 },
            { type: "modifyReputation", value: 5 },
          ],
          requiresCash: 5000,
        },
        {
          id: "gradual_recovery",
          label: "Gradually resume normal operations",
          outcomeDescription: "Slow and steady. Routes reopen at normal pace.",
          effects: [{ type: "modifyDemand", value: 0.2 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 4: Fuel Crisis (3 steps)
// Triggers: turn >= 4 and player cash >= 20000
// ---------------------------------------------------------------------------

const fuelCrisis: EventChainDefinition = {
  chainId: "fuel_crisis",
  name: "Fuel Crisis",
  description:
    "Fuel reserves are running critically low across the sector. Smart resource management now will determine your survival.",
  triggerCondition: (state: GameState): boolean => {
    return (
      state.turn >= 4 &&
      state.activeEventChains.length === 0 &&
      state.cash >= 20000
    );
  },
  steps: [
    {
      stepIndex: 0,
      prompt:
        "Intelligence reports indicate fuel reserves across the sector are running dangerously low. Prices will spike soon. What do you do now?",
      delayTurns: 0,
      options: [
        {
          id: "stock_up_fuel",
          label: "Buy fuel reserves immediately at current prices",
          outcomeDescription:
            "You lock in fuel at pre-crisis prices. Expensive upfront but saves money when prices spike.",
          effects: [
            { type: "modifyCash", value: -10000 },
            { type: "modifyPrice", value: -0.3 },
          ],
          requiresCash: 10000,
        },
        {
          id: "wait_fuel",
          label: "Wait and see — the reports might be wrong",
          outcomeDescription:
            "You gamble that the crisis won't materialize. If it does, you're exposed.",
          effects: [],
        },
        {
          id: "diversify_fuel_routes",
          label: "Diversify routes to avoid fuel-intensive paths",
          outcomeDescription:
            "You reroute to shorter, more fuel-efficient runs. Less revenue but lower exposure.",
          effects: [
            { type: "modifyDemand", value: -0.1 },
            { type: "modifySpeed", value: -0.1 },
          ],
          requiresAp: 1,
        },
      ],
    },
    {
      stepIndex: 1,
      prompt:
        "The crisis hits. Fuel prices have tripled overnight. Stations are rationing. Your competitors are grounded. How do you manage?",
      delayTurns: 2,
      options: [
        {
          id: "emergency_contracts_fuel",
          label: "Take emergency fuel delivery contracts",
          outcomeDescription:
            "You pivot to delivering fuel itself. Highly profitable right now.",
          effects: [
            { type: "modifyCash", value: 15000 },
            { type: "modifyReputation", value: 4 },
          ],
          requiresAp: 1,
        },
        {
          id: "negotiate_fuel_deal",
          label: "Negotiate a bulk deal with a fuel supplier",
          outcomeDescription:
            "You work a deal for stable supply at reasonable prices. Medium-term relief.",
          effects: [
            { type: "modifyCash", value: -6000 },
            { type: "modifyPrice", value: -0.2 },
          ],
          requiresCash: 6000,
        },
        {
          id: "ground_fuel_crisis",
          label: "Ground most routes and minimize exposure",
          outcomeDescription:
            "You park ships until prices normalize. Very safe but very little revenue.",
          effects: [{ type: "modifyDemand", value: -0.5 }],
        },
      ],
    },
    {
      stepIndex: 2,
      prompt:
        "New fuel reserves have been discovered and prices are normalizing. The crisis is ending. How do you position for recovery?",
      delayTurns: 2,
      options: [
        {
          id: "expand_post_fuel",
          label: "Rapidly expand routes while competitors are still grounded",
          outcomeDescription:
            "First-mover advantage. You claim market share while rivals are slow to recover.",
          effects: [
            { type: "modifyCash", value: -4000 },
            { type: "modifyDemand", value: 0.3 },
            { type: "modifyReputation", value: 5 },
          ],
          requiresCash: 4000,
          requiresAp: 1,
        },
        {
          id: "steady_recovery_fuel",
          label: "Resume normal operations gradually",
          outcomeDescription:
            "Safe, measured recovery. Routes reopen at your own pace.",
          effects: [{ type: "modifyDemand", value: 0.15 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 5: Black Market Scandal (3 steps)
// Triggers: turn >= 7 and reputation >= 30
// ---------------------------------------------------------------------------

const blackMarketScandal: EventChainDefinition = {
  chainId: "black_market_scandal",
  name: "Black Market Scandal",
  description:
    "Rumors of an illegal cargo ring have reached your ears. How you handle this could make or break your reputation.",
  triggerCondition: (state: GameState): boolean => {
    return (
      state.turn >= 7 &&
      state.activeEventChains.length === 0 &&
      state.reputation >= 30
    );
  },
  steps: [
    {
      stepIndex: 0,
      prompt:
        "A tip has surfaced: an illegal cargo ring is operating through your ports. Smuggled goods are moving under cover of your legitimate cargo. What do you do?",
      delayTurns: 0,
      options: [
        {
          id: "expose_ring",
          label: "Immediately report it to the authorities",
          outcomeDescription:
            "You cooperate fully. Clean record maintained and reputation improves.",
          effects: [{ type: "modifyReputation", value: 8 }],
          requiresAp: 1,
        },
        {
          id: "investigate_internally",
          label: "Conduct an internal investigation first",
          outcomeDescription:
            "You look into it quietly. Buys time but delays action.",
          effects: [
            { type: "modifyReputation", value: 2 },
            { type: "modifyCash", value: -2000 },
          ],
          requiresCash: 2000,
        },
        {
          id: "take_cut_scandal",
          label: "Take a cut — look the other way",
          outcomeDescription:
            "You take black market money. Lucrative but dangerous if discovered.",
          effects: [
            { type: "modifyCash", value: 15000 },
            { type: "modifyReputation", value: -5 },
          ],
        },
      ],
    },
    {
      stepIndex: 1,
      prompt:
        "Imperial investigators have begun looking into your company's cargo manifests. They believe the scandal leads to you. How do you respond?",
      delayTurns: 2,
      options: [
        {
          id: "cooperate_investigation",
          label: "Cooperate fully with the investigation",
          outcomeDescription:
            "Full transparency. If you're clean, you walk away with reputation intact.",
          effects: [{ type: "modifyReputation", value: 5 }],
        },
        {
          id: "lawyer_up",
          label: "Hire the best legal team money can buy",
          outcomeDescription:
            "Expensive but effective. Investigators find nothing actionable.",
          effects: [
            { type: "modifyCash", value: -8000 },
            { type: "modifyReputation", value: 2 },
          ],
          requiresCash: 8000,
        },
        {
          id: "bribe_investigators",
          label: "Bribe key investigators to look elsewhere",
          outcomeDescription:
            "Very risky. If successful you escape scrutiny; if caught, catastrophic.",
          effects: [
            { type: "modifyCash", value: -6000 },
            { type: "modifyReputation", value: -8 },
          ],
          requiresCash: 6000,
        },
      ],
    },
    {
      stepIndex: 2,
      prompt:
        "The investigation concludes. Your company is either cleared or implicated, depending on your choices. The sector is watching.",
      delayTurns: 2,
      options: [
        {
          id: "public_statement_cleared",
          label: "Issue a public statement of vindication",
          outcomeDescription:
            "You announce your clearance publicly. Reputation fully restored and then some.",
          effects: [
            { type: "modifyReputation", value: 10 },
            { type: "modifyCash", value: 3000 },
          ],
        },
        {
          id: "quiet_resolution",
          label: "Settle quietly and move on",
          outcomeDescription:
            "You pay a fine and avoid publicity. Modest reputation cost, minimal disruption.",
          effects: [
            { type: "modifyCash", value: -3000 },
            { type: "modifyReputation", value: -3 },
          ],
          requiresCash: 3000,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 6: Empire Succession (4 steps)
// Triggers: turn >= 10 and reputation >= 50
// ---------------------------------------------------------------------------

const empireSuccession: EventChainDefinition = {
  chainId: "empire_succession",
  name: "Empire Succession Crisis",
  description:
    "The leader of a major empire is gravely ill. The power struggle that follows will reshape trade for years to come.",
  triggerCondition: (state: GameState): boolean => {
    return (
      state.turn >= 10 &&
      state.activeEventChains.length === 0 &&
      state.reputation >= 50
    );
  },
  steps: [
    {
      stepIndex: 0,
      prompt:
        "Word has spread: the leader of a powerful empire is gravely ill. Succession is uncertain and factions are already jockeying for power. How do you position yourself?",
      delayTurns: 0,
      options: [
        {
          id: "curry_favor_succession",
          label: "Curry favor with the presumed heir",
          outcomeDescription:
            "You invest in the relationship with the likely successor. Expensive but could pay huge dividends.",
          effects: [
            { type: "modifyCash", value: -6000 },
            { type: "modifyReputation", value: 6 },
          ],
          requiresCash: 6000,
          requiresReputation: 50,
        },
        {
          id: "stay_neutral_succession",
          label: "Stay neutral — don't pick sides yet",
          outcomeDescription:
            "You wait and watch. Safe for now but you miss early opportunities.",
          effects: [],
        },
        {
          id: "position_transition",
          label: "Prepare your company for leadership transition",
          outcomeDescription:
            "You quietly diversify and reduce exposure to the troubled empire.",
          effects: [
            { type: "modifyDemand", value: -0.1 },
            { type: "modifyReputation", value: 2 },
          ],
          requiresAp: 1,
        },
      ],
    },
    {
      stepIndex: 1,
      prompt:
        "The power struggle begins in earnest. Two factions are vying for control of the empire. Trade routes through their territory are becoming unpredictable.",
      delayTurns: 3,
      options: [
        {
          id: "back_faction_a",
          label: "Back Faction A — the traditionalists",
          outcomeDescription:
            "You align with the established power structure. Steady but conservative.",
          effects: [
            { type: "modifyCash", value: -4000 },
            { type: "modifyReputation", value: 5 },
          ],
          requiresCash: 4000,
        },
        {
          id: "back_faction_b",
          label: "Back Faction B — the reformers",
          outcomeDescription:
            "You support the reform movement. High risk, but if they win, new trade deals await.",
          effects: [
            { type: "modifyCash", value: -4000 },
            { type: "modifyReputation", value: 4 },
            { type: "modifyDemand", value: 0.1 },
          ],
          requiresCash: 4000,
        },
        {
          id: "play_both_sides",
          label: "Play both sides subtly",
          outcomeDescription:
            "You make small gestures to both factions. Neither fully trusts you but you're not burned.",
          effects: [{ type: "modifyCash", value: -3000 }],
          requiresCash: 3000,
        },
      ],
    },
    {
      stepIndex: 2,
      prompt:
        "The new leader demands a loyalty test from major trade companies operating in their empire. This is your moment of commitment.",
      delayTurns: 2,
      options: [
        {
          id: "full_loyalty",
          label: "Pledge full loyalty and make a substantial tribute",
          outcomeDescription:
            "You demonstrate total commitment. Expensive but you become the new regime's favored partner.",
          effects: [
            { type: "modifyCash", value: -10000 },
            { type: "modifyReputation", value: 15 },
            { type: "modifyDemand", value: 0.3 },
          ],
          requiresCash: 10000,
        },
        {
          id: "partial_loyalty",
          label: "Make a token gesture — enough to satisfy",
          outcomeDescription:
            "You give a small tribute and some words of support. Modest outcome.",
          effects: [
            { type: "modifyCash", value: -2000 },
            { type: "modifyReputation", value: 4 },
          ],
          requiresCash: 2000,
        },
        {
          id: "refuse_loyalty",
          label: "Refuse the loyalty test — assert your independence",
          outcomeDescription:
            "You stand your ground. The new regime is annoyed but respects the boldness — if your reputation is strong enough.",
          effects: [{ type: "modifyReputation", value: -5 }],
        },
      ],
    },
    {
      stepIndex: 3,
      prompt:
        "The succession is complete. The new order is established and the sector adjusts to the new political reality. Reap what you have sown.",
      delayTurns: 2,
      options: [
        {
          id: "celebrate_succession",
          label: "Host a gala to celebrate the new leadership",
          outcomeDescription:
            "You make a visible gesture of goodwill. Reputation boost and good trade relations established.",
          effects: [
            { type: "modifyCash", value: -3000 },
            { type: "modifyReputation", value: 10 },
            { type: "modifyDemand", value: 0.2 },
          ],
          requiresCash: 3000,
        },
        {
          id: "business_as_usual",
          label: "Return to normal operations",
          outcomeDescription:
            "You focus on running your business. Steady and reliable.",
          effects: [{ type: "modifyDemand", value: 0.1 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// All chain definitions exported
// ---------------------------------------------------------------------------

export const EVENT_CHAIN_DEFINITIONS: EventChainDefinition[] = [
  pirateCampaign,
  diplomaticCrisis,
  plague,
  fuelCrisis,
  blackMarketScandal,
  empireSuccession,
];

/** Look up a chain definition by its chainId */
export function getChainDefinition(
  chainId: EventChainId,
): EventChainDefinition | undefined {
  return EVENT_CHAIN_DEFINITIONS.find((d) => d.chainId === chainId);
}
