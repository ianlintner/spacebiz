import type { EventTemplate } from "./EventDefinitions.ts";

/** Tier 1 = effects-bearing; Tier 2 = pure flavor anomaly. */
type SpaceHazardEventTemplate = EventTemplate & { tier: 1 | 2 };

// ===========================================================================
// Tier 1 — Effects-bearing space hazards (8 events)
// ===========================================================================

const hyperlaneInstability: SpaceHazardEventTemplate = {
  id: "hyperlane_instability",
  name: "Hyperlane Instability",
  description:
    "Subspace currents in {target} are surging unpredictably. Hyperlanes through the sector are intermittently impassable.",
  category: "hazard",
  duration: 2,
  weight: 4,
  headwindWeight: 5,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifySpeed", value: -50, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "reroute_traffic",
      label: "Reroute fleet around the affected lanes",
      outcomeDescription: "You absorb the time hit but ships stay safe.",
      baseSuccess: 70,
      scalingTags: ["fleetSize", "navigation"],
      effects: [{ type: "modifyCash", value: -3000 }],
    },
    {
      id: "wait_it_out",
      label: "Hold ships in port until lanes stabilize",
      outcomeDescription: "Lost contracts pile up but no ships are lost.",
      baseSuccess: 80,
      scalingTags: ["cash"],
      effects: [{ type: "modifyCash", value: -5000 }],
    },
    {
      id: "send_repair_crew",
      label: "Charter a repair team to stabilize the lanes",
      outcomeDescription:
        "Risky and expensive — but you're the hero if it works.",
      baseSuccess: 45,
      scalingTags: ["tech", "navigation"],
      effects: [
        { type: "modifyCash", value: -8000 },
        { type: "modifyReputation", value: 6 },
      ],
    },
  ],
};

const wormholeDetected: SpaceHazardEventTemplate = {
  id: "wormhole_detected",
  name: "Wormhole Detected",
  description:
    "Survey ships near {target} have logged a stable wormhole opening into a distant system. The shortcut won't last forever.",
  category: "hazard",
  duration: 3,
  weight: 2,
  headwindWeight: 1,
  tailwindWeight: 4,
  tier: 1,
  effects: [{ type: "modifyCash", value: 0 }], // economic gain encoded in choices
  requiresChoice: true,
  choiceOptions: [
    {
      id: "exploit_wormhole",
      label: "Run high-margin cargo through the shortcut",
      outcomeDescription: "Big payday if you're fast enough.",
      baseSuccess: 60,
      scalingTags: ["fleetSize", "navigation"],
      effects: [{ type: "modifyCash", value: 18000 }],
    },
    {
      id: "report_wormhole",
      label: "Report the wormhole to imperial astrocartography",
      outcomeDescription: "Earn imperial favor and a finder's fee.",
      baseSuccess: 75,
      scalingTags: ["rep"],
      effects: [
        { type: "modifyCash", value: 4000 },
        { type: "modifyReputation", value: 8 },
      ],
    },
    {
      id: "sell_coordinates",
      label: "Sell coordinates to the highest bidder",
      outcomeDescription: "Cash up, reputation down — someone always talks.",
      baseSuccess: 55,
      scalingTags: ["cash"],
      effects: [
        { type: "modifyCash", value: 12000 },
        { type: "modifyReputation", value: -5 },
      ],
    },
  ],
};

const radiationBurst: SpaceHazardEventTemplate = {
  id: "radiation_burst",
  name: "Radiation Burst",
  description:
    "A pulsar near {target} has triggered a hard-radiation cascade through nearby trade lanes.",
  category: "hazard",
  duration: 2,
  weight: 4,
  headwindWeight: 4,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifyFleetCondition", value: -15, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "shield_up",
      label: "Pay for hardened shielding upgrade",
      outcomeDescription: "Hull integrity preserved, wallet hurts.",
      baseSuccess: 75,
      scalingTags: ["cash", "tech"],
      effects: [{ type: "modifyCash", value: -7000 }],
    },
    {
      id: "push_through",
      label: "Push through with current shielding",
      outcomeDescription: "Faster delivery, but ships take a beating.",
      baseSuccess: 40,
      scalingTags: ["fleetCondition"],
      effects: [
        { type: "modifyFleetCondition", value: -25, targetId: "{target}" },
      ],
    },
    {
      id: "detour_radiation",
      label: "Long detour around the radiation",
      outcomeDescription: "Safe but slow — contracts may slip.",
      baseSuccess: 80,
      scalingTags: ["navigation"],
      effects: [{ type: "modifyCash", value: -2500 }],
    },
  ],
};

const gravitationalAnomaly: SpaceHazardEventTemplate = {
  id: "gravitational_anomaly",
  name: "Gravitational Anomaly",
  description:
    "A localized gravity well near {target} is bending light and slowing every ship that crosses it.",
  category: "hazard",
  duration: 2,
  weight: 4,
  headwindWeight: 3,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifySpeed", value: -20, targetId: "{target}" }],
};

const spatialRift: SpaceHazardEventTemplate = {
  id: "spatial_rift",
  name: "Spatial Rift",
  description:
    "Reality is buckling near {target}. A cargo freighter has already vanished into the rift.",
  category: "hazard",
  duration: 1,
  weight: 2,
  headwindWeight: 5,
  tailwindWeight: 0,
  tier: 1,
  effects: [{ type: "blockRoute", value: 1, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "salvage_rift",
      label: "Send a salvage team to recover the cargo",
      outcomeDescription: "Risky — but the cargo is worth a fortune.",
      baseSuccess: 40,
      scalingTags: ["fleetCondition", "tech"],
      effects: [
        { type: "modifyCash", value: 14000 },
        { type: "modifyFleetCondition", value: -10, targetId: "{target}" },
      ],
    },
    {
      id: "abandon_rift",
      label: "Write off the cargo and reroute traffic",
      outcomeDescription: "Take the loss, keep your ships intact.",
      baseSuccess: 90,
      scalingTags: ["navigation"],
      effects: [{ type: "modifyCash", value: -6000 }],
    },
    {
      id: "sell_rift_info",
      label: "Sell rift coordinates to a research consortium",
      outcomeDescription: "Modest cash, but academics will remember you.",
      baseSuccess: 70,
      scalingTags: ["rep"],
      effects: [
        { type: "modifyCash", value: 4500 },
        { type: "modifyReputation", value: 4 },
      ],
    },
  ],
};

const darkMatterSurge: SpaceHazardEventTemplate = {
  id: "dark_matter_surge",
  name: "Dark Matter Surge",
  description:
    "Dark-matter density in the {target} sector has spiked, ballooning fuel-burn rates galaxy-wide.",
  category: "hazard",
  duration: 3,
  weight: 3,
  headwindWeight: 4,
  tailwindWeight: 1,
  tier: 1,
  // Note: "fuel" is not a valid CargoType in this codebase, so we apply the
  // price increase galaxy-wide (no cargoType field) to model rising operating costs.
  effects: [{ type: "modifyPrice", value: 30 }],
};

const ionTempest: SpaceHazardEventTemplate = {
  id: "ion_tempest",
  name: "Ion Tempest",
  description:
    "An ion tempest has knocked out long-range comms across {target}. Diplomacy and rival messaging silenced.",
  category: "hazard",
  duration: 2,
  weight: 2,
  headwindWeight: 3,
  tailwindWeight: 1,
  tier: 1,
  // Effects deferred until a suspendComms effect lands; for now ion_tempest fires as flavor.
  effects: [],
};

const stellarCollapseWarning: SpaceHazardEventTemplate = {
  id: "stellar_collapse_warning",
  name: "Stellar Collapse Warning",
  description:
    "The star at the heart of {target} is collapsing. Mass evacuation is underway and all in-system trade is suspended.",
  category: "hazard",
  duration: 3,
  weight: 1,
  headwindWeight: 8,
  tailwindWeight: 0,
  tier: 1,
  effects: [{ type: "blockSystem", value: 1, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "evacuate_assets",
      label: "Evacuate your in-system assets",
      outcomeDescription: "Take the financial hit but salvage your fleet.",
      baseSuccess: 75,
      scalingTags: ["fleetSize", "navigation"],
      effects: [{ type: "modifyCash", value: -8000 }],
    },
    {
      id: "stay_put",
      label: "Bet the star's collapse will be slower than projected",
      outcomeDescription:
        "If the prediction is wrong, big rewards. If right, big losses.",
      baseSuccess: 30,
      scalingTags: ["cash"],
      effects: [{ type: "modifyCash", value: 12000 }],
    },
    {
      id: "evac_profiteer",
      label: "Charter your ships as evacuation transport at premium rates",
      outcomeDescription: "Cash on hand goes up, public opinion goes down.",
      baseSuccess: 60,
      scalingTags: ["fleetSize"],
      effects: [
        { type: "modifyCash", value: 16000 },
        { type: "modifyReputation", value: -8 },
      ],
    },
  ],
};

// ===========================================================================
// Tier 2 — Flavor-only anomalies (7 events; no gameplay effects)
// ===========================================================================

const ghostSignal: SpaceHazardEventTemplate = {
  id: "ghost_signal",
  name: "Ghost Signal",
  description:
    "A repeating signal from {target} matches no known civilization. Linguists are flocking to study it.",
  category: "hazard",
  duration: 1,
  weight: 2,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const ancientProbeDetected: SpaceHazardEventTemplate = {
  id: "ancient_probe_detected",
  name: "Ancient Probe Detected",
  description:
    "Long-range scans pick up a pre-hyperlane probe drifting in the {target} void.",
  category: "hazard",
  duration: 1,
  weight: 2,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const temporalEcho: SpaceHazardEventTemplate = {
  id: "temporal_echo",
  name: "Temporal Echo",
  description:
    "Multiple crews near {target} report seeing themselves emerge from the same hyperlane minutes earlier.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const voidChoirPhenomenon: SpaceHazardEventTemplate = {
  id: "void_choir_phenomenon",
  name: "Void Choir Phenomenon",
  description:
    "Harmonic frequencies of unknown origin are emanating from deep space near {target}.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const massHallucinationReport: SpaceHazardEventTemplate = {
  id: "mass_hallucination_report",
  name: "Mass Hallucination Report",
  description:
    "Three independent crews from {target} report identical visions of an unknown world.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const unexplainedFormation: SpaceHazardEventTemplate = {
  id: "unexplained_formation",
  name: "Unexplained Formation",
  description:
    "An asteroid field near {target} has spontaneously aligned into a flawless geometric pattern.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const firstContactSignal: SpaceHazardEventTemplate = {
  id: "first_contact_signal",
  name: "First Contact Signal",
  description:
    "A possible non-human transmission is being decoded near {target}. The xenobiology desks are losing their minds.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

// ===========================================================================
// Exports
// ===========================================================================

export const TIER_1_HAZARDS: SpaceHazardEventTemplate[] = [
  hyperlaneInstability,
  wormholeDetected,
  radiationBurst,
  gravitationalAnomaly,
  spatialRift,
  darkMatterSurge,
  ionTempest,
  stellarCollapseWarning,
];

export const TIER_2_ANOMALIES: SpaceHazardEventTemplate[] = [
  ghostSignal,
  ancientProbeDetected,
  temporalEcho,
  voidChoirPhenomenon,
  massHallucinationReport,
  unexplainedFormation,
  firstContactSignal,
];

export const ALL_SPACE_HAZARDS: SpaceHazardEventTemplate[] = [
  ...TIER_1_HAZARDS,
  ...TIER_2_ANOMALIES,
];
