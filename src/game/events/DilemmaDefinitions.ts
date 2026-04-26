import type { DilemmaTemplate } from "../../data/types.ts";

/**
 * v1 starter pool of player dilemmas. Each option declares the state inputs
 * (`scalingTags`) that move its success%, and unscaled "100%" effect values.
 * SuccessFormula scales effect magnitudes at resolve-time.
 *
 * Authoring guidelines:
 *   - 2–4 options per dilemma; meaningfully different tradeoffs.
 *   - At least one option should "feel safe" (lower stakes, safer scaling tag).
 *   - At least one option should "feel bold" (bigger effect, riskier scaling).
 *   - Use {empire}, {rival}, {port} for subject binding.
 *   - `headwindWeight` boosts firing when player is winning; `tailwindWeight`
 *     boosts firing when player is struggling.
 */
export const DILEMMA_TEMPLATES: DilemmaTemplate[] = [
  // -------------------------------------------------------------------------
  // Operational — fleet/route stress
  // -------------------------------------------------------------------------
  {
    id: "engineer_strike",
    category: "operational",
    imageKey: "dilemma_engineer_strike",
    prompt:
      "Engineers across {port} are threatening a wildcat strike. They want hazard pay, or they walk.",
    weight: 8,
    headwindWeight: 6,
    tailwindWeight: 1,
    options: [
      {
        id: "pay_demands",
        label: "Pay the hazard premium",
        outcomeDescription: "Crews stay on the line. Costs hurt, morale holds.",
        baseSuccess: 60,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -8000 },
          { type: "modifyReputation", value: 4 },
        ],
      },
      {
        id: "rotate_crews",
        label: "Rotate fresh crews from your fleet",
        outcomeDescription:
          "You absorb the hit by leaning on your operational depth.",
        baseSuccess: 45,
        scalingTags: ["fleetSize", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: -1500 },
          { type: "modifyReputation", value: 2 },
        ],
      },
      {
        id: "break_strike",
        label: "Break the strike publicly",
        outcomeDescription:
          "Cheaper today, costlier in goodwill. Word travels.",
        baseSuccess: 40,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: -500 },
          { type: "modifyReputation", value: -10 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Diplomatic — empire / rival friction
  // -------------------------------------------------------------------------
  {
    id: "tariff_brinkmanship",
    category: "diplomatic",
    imageKey: "dilemma_tariff_brinkmanship",
    prompt:
      "{empire} is hinting at a tariff hike that would gut your margins. A back-channel deal might smooth it over.",
    weight: 6,
    headwindWeight: 5,
    tailwindWeight: 2,
    options: [
      {
        id: "diplomatic_visit",
        label: "Send a diplomatic envoy",
        outcomeDescription:
          "A formal visit demonstrates respect. Reputation matters here.",
        baseSuccess: 55,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyReputation", value: 6 },
          { type: "modifyCash", value: -2000 },
        ],
      },
      {
        id: "covert_payments",
        label: "Quiet payments to key officials",
        outcomeDescription:
          "Money talks loudest. So does the audit if it leaks.",
        baseSuccess: 50,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -10000 },
          { type: "modifyReputation", value: -3 },
        ],
      },
      {
        id: "go_public",
        label: "Threaten to pull out of {empire} markets",
        outcomeDescription:
          "A risky public stance — your fleet's heft is the leverage.",
        baseSuccess: 40,
        scalingTags: ["fleetSize"],
        effects: [
          { type: "modifyReputation", value: 8 },
          { type: "modifyCash", value: -3000 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Financial — credit / market shock
  // -------------------------------------------------------------------------
  {
    id: "credit_squeeze",
    category: "financial",
    imageKey: "dilemma_credit_squeeze",
    prompt:
      "Sector banks are tightening credit. Your liquidity coverage is being scrutinized.",
    weight: 6,
    headwindWeight: 3,
    tailwindWeight: 4,
    options: [
      {
        id: "shore_up_cash",
        label: "Park reserves with the trustees",
        outcomeDescription:
          "Show them you're solid. The cushion gets you through.",
        baseSuccess: 65,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -2500 },
          { type: "modifyReputation", value: 5 },
        ],
      },
      {
        id: "tech_pitch",
        label: "Pitch your modernization roadmap",
        outcomeDescription:
          "Investors love R&D. Your tech portfolio is the story.",
        baseSuccess: 50,
        scalingTags: ["tech"],
        effects: [
          { type: "modifyCash", value: 4000 },
          { type: "modifyReputation", value: 3 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Narrative — character / flavor
  // -------------------------------------------------------------------------
  {
    id: "rival_recruits",
    category: "narrative",
    imageKey: "dilemma_rival_recruits",
    prompt:
      "{rival} has been quietly poaching your senior crews with signing bonuses. The dock chatter is getting noisy.",
    weight: 5,
    headwindWeight: 4,
    tailwindWeight: 2,
    options: [
      {
        id: "match_offers",
        label: "Match the signing bonuses",
        outcomeDescription: "Expensive, but loyalty has a price.",
        baseSuccess: 55,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -6000 }],
      },
      {
        id: "promote_within",
        label: "Promote from within and grant equity",
        outcomeDescription: "Your reputation as a fair boss is the moat here.",
        baseSuccess: 50,
        scalingTags: ["rep", "fleetSize"],
        effects: [{ type: "modifyReputation", value: 6 }],
      },
      {
        id: "let_them_go",
        label: "Let them go — train new talent",
        outcomeDescription:
          "Painful in the short term. Resilient organizations recover.",
        baseSuccess: 40,
        scalingTags: ["fleetCondition"],
        effects: [
          { type: "modifyCash", value: -1500 },
          { type: "modifyReputation", value: -2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Operational mid-game — modernization
  // -------------------------------------------------------------------------
  {
    id: "retrofit_offer",
    category: "operational",
    imageKey: "dilemma_retrofit_offer",
    prompt:
      "An engineering consortium offers a fleet retrofit package — better fuel efficiency, but the install windows ground ships for a turn.",
    weight: 4,
    headwindWeight: 1,
    tailwindWeight: 3,
    eligibility: "midGame",
    options: [
      {
        id: "accept_full",
        label: "Retrofit the entire fleet",
        outcomeDescription:
          "Bold investment. Tech-heavy companies handle the disruption better.",
        baseSuccess: 50,
        scalingTags: ["tech", "fleetSize"],
        effects: [
          { type: "modifyCash", value: -12000 },
          { type: "modifyReputation", value: 4 },
        ],
      },
      {
        id: "accept_partial",
        label: "Retrofit only your worst ships",
        outcomeDescription: "Conservative play, modest payoff.",
        baseSuccess: 65,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyCash", value: -4000 }],
      },
      {
        id: "decline",
        label: "Decline — keep ships in service",
        outcomeDescription:
          "No disruption, no upgrade. The consortium will remember.",
        baseSuccess: 70,
        scalingTags: [],
        effects: [{ type: "modifyReputation", value: -2 }],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Operational crisis — quarantine outbreak
  // -------------------------------------------------------------------------
  {
    id: "quarantine_outbreak",
    category: "operational",
    imageKey: "dilemma_quarantine_outbreak",
    prompt:
      "A novel pathogen is sweeping {port}. Local authorities want immediate action — and the press is already on it.",
    weight: 6,
    headwindWeight: 3,
    tailwindWeight: 5,
    options: [
      {
        id: "lockdown_routes",
        label: "Lock down all {port} routes",
        outcomeDescription:
          "Halt traffic until the outbreak clears. Safe, but margins evaporate.",
        baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -5000 },
          { type: "modifyReputation", value: 6 },
        ],
      },
      {
        id: "smuggle_vaccines",
        label: "Run vaccines through quietly",
        outcomeDescription:
          "Tech-heavy fleets can move medical cargo discreetly. Big upside, big optics risk if caught.",
        baseSuccess: 45,
        scalingTags: ["tech", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: 6000 },
          { type: "modifyReputation", value: 5 },
        ],
      },
      {
        id: "public_health_pr",
        label: "Fund a public health campaign",
        outcomeDescription:
          "Spend big, look good. Reputation does the heavy lifting.",
        baseSuccess: 60,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: -8000 },
          { type: "modifyReputation", value: 10 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Narrative — corporate espionage
  // -------------------------------------------------------------------------
  {
    id: "corporate_espionage",
    category: "narrative",
    imageKey: "dilemma_corporate_espionage",
    prompt:
      "A defector from {rival} offers you a dossier of stolen R&D plans. Your move sets the tone for years.",
    weight: 4,
    headwindWeight: 5,
    tailwindWeight: 1,
    eligibility: "midGame",
    options: [
      {
        id: "buy_dossier",
        label: "Buy the dossier",
        outcomeDescription:
          "Tech windfall — but if it leaks, the lawsuits are real.",
        baseSuccess: 55,
        scalingTags: ["tech", "cash"],
        effects: [
          { type: "modifyCash", value: -7000 },
          { type: "modifyReputation", value: -4 },
        ],
      },
      {
        id: "report_defector",
        label: "Report the defector to {rival}",
        outcomeDescription: "The high road. Goodwill banked across the sector.",
        baseSuccess: 65,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 8 }],
      },
      {
        id: "counter_intel",
        label: "Run counter-intel — feed them garbage",
        outcomeDescription:
          "A spy game. Deeply researched companies pull this off; others get burned.",
        baseSuccess: 40,
        scalingTags: ["tech"],
        effects: [
          { type: "modifyCash", value: 3000 },
          { type: "modifyReputation", value: 2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Diplomatic — bandit warlord shakedown
  // -------------------------------------------------------------------------
  {
    id: "bandit_warlord_offer",
    category: "diplomatic",
    imageKey: "dilemma_bandit_warlord_offer",
    prompt:
      "A self-styled warlord controls a chokepoint near {port} and wants tribute for safe passage.",
    weight: 5,
    headwindWeight: 4,
    tailwindWeight: 3,
    options: [
      {
        id: "pay_tribute",
        label: "Pay the tribute",
        outcomeDescription:
          "Routes stay open. Cheap relative to the alternative — until the next demand.",
        baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -4500 },
          { type: "modifyReputation", value: -3 },
        ],
      },
      {
        id: "fight_warlord",
        label: "Run the gauntlet with armed escort",
        outcomeDescription:
          "A larger, healthier fleet calls the bluff. A smaller one bleeds.",
        baseSuccess: 35,
        scalingTags: ["fleetSize", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: -2000 },
          { type: "modifyReputation", value: 8 },
        ],
      },
      {
        id: "negotiate_alliance",
        label: "Offer a trade pact instead",
        outcomeDescription:
          "Turn enemy into partner. Reputation does the talking.",
        baseSuccess: 45,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: -1500 },
          { type: "modifyReputation", value: 5 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Financial — data breach
  // -------------------------------------------------------------------------
  {
    id: "data_breach",
    category: "financial",
    imageKey: "dilemma_data_breach",
    prompt:
      "Your books are leaking. A blogger is shopping the story. You have hours, not days.",
    weight: 5,
    headwindWeight: 5,
    tailwindWeight: 2,
    options: [
      {
        id: "buy_silence",
        label: "Buy the leak's silence",
        outcomeDescription:
          "Quietly resolved. The cost is real, the precedent worse.",
        baseSuccess: 60,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -9000 },
          { type: "modifyReputation", value: -2 },
        ],
      },
      {
        id: "preempt_disclosure",
        label: "Pre-empt with a public disclosure",
        outcomeDescription: "Own the narrative. Investors respect the spine.",
        baseSuccess: 55,
        scalingTags: ["rep", "tech"],
        effects: [
          { type: "modifyCash", value: -2500 },
          { type: "modifyReputation", value: 6 },
        ],
      },
      {
        id: "sue_the_leak",
        label: "Lawyer up — sue the leak",
        outcomeDescription:
          "A long road. Tech-heavy IP defense makes this winnable.",
        baseSuccess: 45,
        scalingTags: ["tech", "cash"],
        effects: [
          { type: "modifyCash", value: -4000 },
          { type: "modifyReputation", value: 1 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Opportunity (late-game) — inherited derelict mega-hauler
  // -------------------------------------------------------------------------
  {
    id: "legacy_freighter_inheritance",
    category: "opportunity",
    imageKey: "dilemma_legacy_freighter",
    prompt:
      "A deceased competitor's family offers you their derelict mega-hauler. Restoration is huge — and risky.",
    weight: 3,
    headwindWeight: 1,
    tailwindWeight: 4,
    eligibility: "lateGame",
    options: [
      {
        id: "restore_ship",
        label: "Restore the mega-hauler to service",
        outcomeDescription:
          "A trophy ship — if your shipyards can handle the work.",
        baseSuccess: 50,
        scalingTags: ["tech", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: -15000 },
          { type: "modifyReputation", value: 8 },
        ],
      },
      {
        id: "scrap_for_parts",
        label: "Scrap her for parts",
        outcomeDescription:
          "Pragmatic. The salvage covers retrofits across your fleet.",
        baseSuccess: 70,
        scalingTags: ["fleetSize"],
        effects: [
          { type: "modifyCash", value: 6000 },
          { type: "modifyReputation", value: -1 },
        ],
      },
      {
        id: "sell_to_rival",
        label: "Resell to {rival}",
        outcomeDescription: "Cash today, a competitor's strength tomorrow.",
        baseSuccess: 65,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: 8000 },
          { type: "modifyReputation", value: -3 },
        ],
      },
    ],
  },
];
