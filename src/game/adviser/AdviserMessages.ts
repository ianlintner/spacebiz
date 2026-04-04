import type { AdviserMood, AdviserMessageContext } from "../../data/types.ts";

export interface MessageTemplate {
  id: string;
  text: string;
  mood: AdviserMood;
  priority: 1 | 2 | 3;
  context: AdviserMessageContext;
}

// ── Turn commentary by grade ───────────────────────────────

export const GRADE_COMMENTARY: Record<string, MessageTemplate[]> = {
  S: [
    {
      id: "grade_s_1",
      text: "Outstanding quarter, Commander. Margins like these make shareholders howl with joy.",
      mood: "success",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_s_2",
      text: "Exceptional performance. At this rate, we could buy the competition before lunch.",
      mood: "success",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_s_3",
      text: "Profit margins above 40%. I recommend framing this report.",
      mood: "success",
      priority: 1,
      context: "commentary",
    },
  ],
  A: [
    {
      id: "grade_a_1",
      text: "Strong quarter. Revenue is healthy and the fleet is earning its keep.",
      mood: "success",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_a_2",
      text: "Solid returns across the board. Keep this trajectory and we'll dominate the sector.",
      mood: "success",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_a_3",
      text: "Good margins this quarter. The board would approve — if we had one.",
      mood: "success",
      priority: 1,
      context: "commentary",
    },
  ],
  B: [
    {
      id: "grade_b_1",
      text: "Decent quarter. We're in the black, but there's room for optimization.",
      mood: "standby",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_b_2",
      text: "Moderate profit. Not bad, but I've run simulations that suggest we can do better.",
      mood: "analyzing",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_b_3",
      text: "We're profitable this quarter. Consider diversifying routes for stronger margins.",
      mood: "standby",
      priority: 1,
      context: "commentary",
    },
  ],
  C: [
    {
      id: "grade_c_1",
      text: "Break-even territory. We're not losing credits, but we're not making them either.",
      mood: "analyzing",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_c_2",
      text: "Thin margins this quarter. One bad event could tip us into the red.",
      mood: "analyzing",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_c_3",
      text: "Revenue barely covers costs. Time to review route efficiency.",
      mood: "analyzing",
      priority: 1,
      context: "commentary",
    },
  ],
  D: [
    {
      id: "grade_d_1",
      text: "We're bleeding credits, Commander. This course isn't sustainable.",
      mood: "alert",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_d_2",
      text: "Losses this quarter. I suggest reviewing fuel costs and route selection immediately.",
      mood: "alert",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_d_3",
      text: "The numbers are concerning. Operational adjustments are urgently recommended.",
      mood: "alert",
      priority: 1,
      context: "commentary",
    },
  ],
  F: [
    {
      id: "grade_f_1",
      text: "Critical losses. At this burn rate, bankruptcy is a matter of quarters, not years.",
      mood: "alert",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_f_2",
      text: "Severe financial distress. Consider selling underperforming ships to stay afloat.",
      mood: "alert",
      priority: 1,
      context: "commentary",
    },
    {
      id: "grade_f_3",
      text: "This is a financial emergency. Every route needs to be re-evaluated NOW.",
      mood: "alert",
      priority: 1,
      context: "commentary",
    },
  ],
};

// ── Event reactions ────────────────────────────────────────

export const EVENT_REACTIONS: Record<string, MessageTemplate[]> = {
  market: [
    {
      id: "evt_market_1",
      text: "Market shift detected. Prices are fluctuating — there may be opportunity here.",
      mood: "analyzing",
      priority: 2,
      context: "event",
    },
    {
      id: "evt_market_2",
      text: "Supply and demand indices have shifted. Adjusting forecasts accordingly.",
      mood: "analyzing",
      priority: 2,
      context: "event",
    },
    {
      id: "evt_market_3",
      text: "Economic conditions are evolving. Keep an eye on commodity trends.",
      mood: "analyzing",
      priority: 2,
      context: "event",
    },
  ],
  hazard: [
    {
      id: "evt_hazard_1",
      text: "Hazard alert! Operational disruptions may impact route performance.",
      mood: "alert",
      priority: 2,
      context: "event",
    },
    {
      id: "evt_hazard_2",
      text: "Warning: environmental threats detected in active shipping lanes.",
      mood: "alert",
      priority: 2,
      context: "event",
    },
    {
      id: "evt_hazard_3",
      text: "Danger zones flagged on the nav charts. Proceed with caution, Commander.",
      mood: "alert",
      priority: 2,
      context: "event",
    },
  ],
  opportunity: [
    {
      id: "evt_opp_1",
      text: "An opportunity has presented itself. Fortune favors the bold, Commander.",
      mood: "success",
      priority: 2,
      context: "event",
    },
    {
      id: "evt_opp_2",
      text: "Favorable conditions detected. I recommend capitalizing on this immediately.",
      mood: "success",
      priority: 2,
      context: "event",
    },
    {
      id: "evt_opp_3",
      text: "Good news incoming! The stars are aligning — metaphorically speaking.",
      mood: "success",
      priority: 2,
      context: "event",
    },
  ],
  flavor: [
    {
      id: "evt_flavor_1",
      text: "Interesting development in the sector. No financial impact, but worth noting.",
      mood: "standby",
      priority: 3,
      context: "event",
    },
    {
      id: "evt_flavor_2",
      text: "Cultural update from the galactic newswire. Filed for your amusement.",
      mood: "standby",
      priority: 3,
      context: "event",
    },
    {
      id: "evt_flavor_3",
      text: "A curious bit of news crossed my desk. Thought you'd appreciate it.",
      mood: "standby",
      priority: 3,
      context: "event",
    },
  ],
};

// ── Contextual tips ────────────────────────────────────────

export const CONTEXTUAL_TIPS: MessageTemplate[] = [
  {
    id: "tip_routes_1",
    text: "Tip: Diversifying your routes across multiple systems reduces risk from localized events.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_routes_2",
    text: "Tip: Shorter routes mean more trips per turn. Sometimes volume beats margin.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_fleet_1",
    text: "Tip: Matching ship types to cargo types maximizes capacity utilization.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_fleet_2",
    text: "Tip: Aging ships have higher breakdown risk. Monitor fleet condition closely.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_fleet_3",
    text: "Tip: Bulk freighters shine on high-demand routes. Fast couriers are best for luxury goods.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_market_1",
    text: "Tip: Watch price trends. Buying when prices are falling and selling when rising maximizes margins.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_market_2",
    text: "Tip: Planets with high demand and low saturation offer the best prices.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_market_3",
    text: "Tip: Fuel price fluctuations directly impact route profitability. Factor them in.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_money_1",
    text: "Tip: Keep a cash reserve. Unexpected events can be costly without a buffer.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_money_2",
    text: "Tip: Loans can fund expansion, but interest compounds. Borrow strategically.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_growth_1",
    text: "Tip: Early expansion is key. More ships and routes mean more revenue potential.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_growth_2",
    text: "Tip: Don't overextend. Each new ship needs a profitable route to justify its cost.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_rep_1",
    text: "Tip: Reputation affects pricing. Higher reputation means better trade deals.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_events_1",
    text: "Tip: Active events have durations. Sometimes waiting them out is the best strategy.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_events_2",
    text: "Tip: Hazard events can block routes. Always have alternative lanes planned.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_passengers_1",
    text: "Tip: Passenger routes can be very lucrative on resort and hub station planets.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_passengers_2",
    text: "Tip: Celebrity passenger events spike demand dramatically. Be ready to capitalize.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_maint_1",
    text: "Tip: Maintenance costs rise with fleet age. Budget for replacements eventually.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_scoring_1",
    text: "Tip: Your final score weighs total profit, fleet value, reputation, and cargo diversity.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
  {
    id: "tip_scoring_2",
    text: "Tip: Delivering all seven cargo types earns a diversity bonus to your final score.",
    mood: "analyzing",
    priority: 3,
    context: "tip",
  },
];

// ── Warning messages ───────────────────────────────────────

export const WARNING_MESSAGES: MessageTemplate[] = [
  {
    id: "warn_debt",
    text: "Warning: We've been in debt for multiple turns. Bankruptcy protocols are within range.",
    mood: "alert",
    priority: 1,
    context: "warning",
  },
  {
    id: "warn_no_routes",
    text: "Warning: No active routes. Ships are sitting idle and costing maintenance without earning.",
    mood: "alert",
    priority: 1,
    context: "warning",
  },
  {
    id: "warn_no_ships",
    text: "Warning: No ships in the fleet. We can't generate revenue without vessels.",
    mood: "alert",
    priority: 1,
    context: "warning",
  },
  {
    id: "warn_single_route",
    text: "Caution: All operations concentrated on a single route. One event could cripple us.",
    mood: "alert",
    priority: 2,
    context: "warning",
  },
  {
    id: "warn_unassigned",
    text: "Caution: Ships without assigned routes are dead weight. Every vessel should earn.",
    mood: "alert",
    priority: 2,
    context: "warning",
  },
  {
    id: "warn_low_condition",
    text: "Caution: Fleet condition is deteriorating. Breakdowns will increase until ships are replaced.",
    mood: "alert",
    priority: 2,
    context: "warning",
  },
];

// ── Streak messages ────────────────────────────────────────

export const STREAK_MESSAGES: MessageTemplate[] = [
  {
    id: "streak_3",
    text: "Three profitable quarters running. Consistency is the mark of a great commander.",
    mood: "success",
    priority: 2,
    context: "commentary",
  },
  {
    id: "streak_5",
    text: "Five-turn profit streak! The K9-Corp efficiency algorithms are purring.",
    mood: "success",
    priority: 2,
    context: "commentary",
  },
  {
    id: "streak_8",
    text: "Eight consecutive profitable turns. I'm running out of superlatives, Commander.",
    mood: "success",
    priority: 2,
    context: "commentary",
  },
];

// ── Storyteller reveal (end-game) ──────────────────────────

export function buildRevealTexts(
  turnsPlayed: number,
  saved: number,
  hindered: number,
): MessageTemplate[] {
  return [
    {
      id: "reveal_1",
      text: `Well played, Commander. ${turnsPlayed} turns of freight hauling, market navigation, and crisis management. Your results were… satisfactory.`,
      mood: "standby",
      priority: 1,
      context: "reveal",
    },
    {
      id: "reveal_2",
      text: "But I should confess something. This was never just about freight. Every trade agreement, every asteroid storm, every lucky break — none of it was random.",
      mood: "analyzing",
      priority: 1,
      context: "reveal",
    },
    {
      id: "reveal_3",
      text: `I arranged ${saved} event${saved !== 1 ? "s" : ""} in your favor when you struggled. I engineered ${hindered} challenge${hindered !== 1 ? "s" : ""} when you thrived. The market, the hazards, the opportunities — they were all part of my design.`,
      mood: "alert",
      priority: 1,
      context: "reveal",
    },
    {
      id: "reveal_4",
      text: "You thought I was your adviser. But I was the game. Every move you made, every choice — it was all entertainment. Well played, Commander. Or did I play you?",
      mood: "standby",
      priority: 1,
      context: "reveal",
    },
  ];
}
