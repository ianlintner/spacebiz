import { ShipClass } from "../../data/types.ts";
import type {
  AICompany,
  Contract,
  GameState,
  Ship,
  MarketState,
  AITurnSummary,
} from "../../data/types.ts";
import {
  SHIP_TEMPLATES,
  AI_STARTING_CASH,
  AI_REPLACEMENT_DELAY,
  AI_REPLACEMENT_CASH_RATIO,
} from "../../data/constants.ts";
import { calculateShipValue } from "../fleet/FleetManager.ts";
import { ageFleet, calculateMaintenanceCosts } from "../fleet/FleetManager.ts";
import {
  AI_COMPANY_NAME_PREFIXES,
  AI_COMPANY_NAME_SUFFIXES,
  AI_PERSONALITIES,
} from "../NewGameSetup.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { pickRandomPortrait } from "../../data/portraits.ts";
import {
  getAIRevenueDebuff,
  getAIMaintenanceDebuff,
} from "../hub/HubBonusCalculator.ts";

// ── Step imports ─────────────────────────────────────────────
import { simulateAIRoutes, applyAISaturation } from "./steps/aiRouteStep.ts";
import { makeAIDecisions } from "./steps/aiDecisionStep.ts";
import { processAITech } from "./steps/aiTechStep.ts";
import {
  processAIContracts,
  applyAIContractRewards,
} from "./steps/aiContractStep.ts";
import { processAIHub, applyAIHubBonuses } from "./steps/aiHubStep.ts";
import { applyAINarrativeEvents } from "./steps/aiNarrativeStep.ts";

// Re-export step utilities used by other modules
export { getAISlotLimit } from "./steps/aiDecisionStep.ts";
export { getAITechBranch } from "./steps/aiTechStep.ts";
export { applyAIHubBonuses } from "./steps/aiHubStep.ts";

// ---------------------------------------------------------------------------
// AI turn simulation
// ---------------------------------------------------------------------------

/**
 * Simulate one turn for all AI companies. Returns updated companies,
 * updated market state (with AI saturation), and turn summaries.
 */
export function simulateAITurns(
  state: GameState,
  rng: SeededRNG,
): {
  aiCompanies: AICompany[];
  contracts: Contract[];
  marketUpdate: MarketState;
  summaries: AITurnSummary[];
} {
  let marketState = state.market;
  const summaries: AITurnSummary[] = [];
  // We'll mutate the contracts list across companies
  let currentContracts = [...state.contracts];

  const updatedCompanies = state.aiCompanies.map((company) => {
    if (company.bankrupt) {
      summaries.push({
        companyId: company.id,
        companyName: company.name,
        revenue: 0,
        netProfit: 0,
        cashAtEnd: company.cash,
        routeCount: 0,
        fleetSize: 0,
        bankrupt: true,
      });
      return company;
    }

    // 1. Run routes — earn revenue and pay fuel+tariffs
    const routeResult = simulateAIRoutes(company, state, marketState, rng);

    // 2. Update saturation from AI deliveries
    marketState = applyAISaturation(marketState, routeResult.deliveries);

    // 3. Maintenance (+ hub Security Office debuff for player's empire AI)
    const hubEmpireId = state.stationHub?.empireId;
    const aiInPlayerEmpire = hubEmpireId && company.empireId === hubEmpireId;
    const aiMaintenanceDebuff = aiInPlayerEmpire
      ? getAIMaintenanceDebuff(state.stationHub)
      : 0;

    // Apply AI hub maintenance bonus
    const rawMaintenance = calculateMaintenanceCosts(company.fleet);
    const hubAdjustedMaint = applyAIHubBonuses(
      0,
      0,
      rawMaintenance,
      company.aiHub,
    ).maintenance;
    const maintenanceCosts = hubAdjustedMaint * (1 + aiMaintenanceDebuff);

    // 4. Age fleet
    const agedFleet = ageFleet(company.fleet, rng);

    // 5. Net profit (+ hub Security Office revenue debuff)
    const aiRevenueDebuff = aiInPlayerEmpire
      ? getAIRevenueDebuff(state.stationHub)
      : 0;
    const adjustedRevenue = routeResult.revenue * (1 + aiRevenueDebuff);
    const netProfit =
      adjustedRevenue -
      routeResult.fuelCost -
      routeResult.tariffCost -
      maintenanceCosts;
    let newCash = company.cash + netProfit;

    // 6. AI decisions (buy ships, open routes)
    let updatedFleet = [...agedFleet];
    let updatedRoutes = [...company.activeRoutes];
    const decisionResult = makeAIDecisions(
      company,
      updatedFleet,
      updatedRoutes,
      newCash,
      state,
      marketState,
      rng,
    );
    updatedFleet = decisionResult.fleet;
    updatedRoutes = decisionResult.routes;
    newCash = decisionResult.cash;

    // 7. AI tech research (Wave 3)
    let updatedCompanyWithTech = processAITech(
      {
        ...company,
        fleet: updatedFleet,
        activeRoutes: updatedRoutes,
        cash: newCash,
      },
      state,
      rng,
    );

    // 8. AI contracts (Wave 3)
    const contractResult = processAIContracts(
      updatedCompanyWithTech,
      { ...state, contracts: currentContracts },
      rng,
    );
    updatedCompanyWithTech = contractResult.company;
    currentContracts = contractResult.updatedContracts;

    // Apply contract rewards for completed AI contracts
    updatedCompanyWithTech = applyAIContractRewards(
      updatedCompanyWithTech,
      currentContracts,
    );
    newCash = updatedCompanyWithTech.cash;

    // Remove contracts that the AI just completed so their rewards aren't applied again next turn
    currentContracts = currentContracts.filter(
      (c) =>
        !(
          c.aiCompanyId === updatedCompanyWithTech.id &&
          c.status === "completed"
        ),
    );

    // 9. AI hub upgrades (Wave 3)
    updatedCompanyWithTech = processAIHub(updatedCompanyWithTech, state);

    // 9a. Storyteller-driven AI narrative beats (buff/debuff with optional headline)
    const narrative = applyAINarrativeEvents(
      updatedCompanyWithTech,
      state,
      rng,
      adjustedRevenue,
      maintenanceCosts,
    );
    newCash += narrative.cashAdjustment;
    const updatedReputation = Math.max(
      0,
      Math.min(
        100,
        updatedCompanyWithTech.reputation + narrative.reputationAdjustment,
      ),
    );
    updatedCompanyWithTech = {
      ...updatedCompanyWithTech,
      cash: newCash,
      reputation: updatedReputation,
      activeNarrativeEffects: narrative.activeNarrativeEffects,
    };

    // 10. Check bankruptcy
    const finalFleet = updatedCompanyWithTech.fleet;
    const totalFleetValue = finalFleet.reduce(
      (sum, s) => sum + calculateShipValue(s),
      0,
    );
    const bankrupt = newCash < 0 && totalFleetValue < Math.abs(newCash);

    const updatedCompany: AICompany = {
      ...updatedCompanyWithTech,
      cash: Math.round(newCash * 100) / 100,
      fleet: finalFleet,
      activeRoutes: bankrupt ? [] : updatedCompanyWithTech.activeRoutes,
      totalCargoDelivered: company.totalCargoDelivered + routeResult.totalCargo,
      bankrupt,
      // Track the turn bankruptcy occurred (keep existing value if already bankrupt)
      bankruptTurn:
        bankrupt && !company.bankrupt ? state.turn : company.bankruptTurn,
    };

    summaries.push({
      companyId: company.id,
      companyName: company.name,
      revenue: Math.round(routeResult.revenue * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      cashAtEnd: updatedCompany.cash,
      routeCount: updatedCompany.activeRoutes.length,
      fleetSize: updatedCompany.fleet.length,
      bankrupt: updatedCompany.bankrupt,
      narrativeBeat: narrative.beat,
    });

    return updatedCompany;
  });

  // ── Replace bankrupt companies after a delay (Aerobiz-style) ──
  const finalCompanies = replaceBankruptCompanies(updatedCompanies, state, rng);

  // Merge updated contracts back into the state (caller receives via return)
  return {
    aiCompanies: finalCompanies,
    contracts: currentContracts,
    marketUpdate: { ...marketState },
    summaries,
  };
}

// ---------------------------------------------------------------------------
// Bankrupt company replacement (Aerobiz-style)
// ---------------------------------------------------------------------------

/**
 * After AI_REPLACEMENT_DELAY turns of bankruptcy, replace a bankrupt company
 * with a fresh newcomer. The new company gets a starter ship, reduced cash,
 * and a random personality — simulating a new entrant seizing the opportunity
 * left by the defunct company.
 */
function replaceBankruptCompanies(
  companies: AICompany[],
  state: GameState,
  rng: SeededRNG,
): AICompany[] {
  // Don't spawn replacements in the final 20% of the game — too late to matter
  if (state.turn > state.maxTurns * 0.8) return companies;

  const existingNames = new Set(companies.map((c) => c.name));
  const empireIds = state.galaxy.empires.map((e) => e.id);

  return companies.map((company) => {
    if (!company.bankrupt) return company;
    if (company.bankruptTurn == null) return company;

    const turnsSinceBankruptcy = state.turn - company.bankruptTurn;
    if (turnsSinceBankruptcy < AI_REPLACEMENT_DELAY) return company;

    // Generate a unique name for the replacement company
    let name: string;
    let attempts = 0;
    do {
      const prefix = rng.pick(AI_COMPANY_NAME_PREFIXES);
      const suffix = rng.pick(AI_COMPANY_NAME_SUFFIXES);
      name = `${prefix} ${suffix}`;
      attempts++;
    } while (existingNames.has(name) && attempts < 50);
    existingNames.add(name);

    // Pick a random personality for variety
    const personality = rng.pick(AI_PERSONALITIES);

    // Pick an empire — prefer one with fewer active AI companies
    const empireCounts = new Map<string, number>();
    for (const eid of empireIds) {
      empireCounts.set(eid, 0);
    }
    for (const c of companies) {
      if (!c.bankrupt) {
        empireCounts.set(c.empireId, (empireCounts.get(c.empireId) ?? 0) + 1);
      }
    }
    const sortedEmpires = [...empireCounts.entries()].sort(
      (a, b) => a[1] - b[1],
    );
    const empireId = sortedEmpires[0]?.[0] ?? company.empireId;

    // Starter ship
    const starterTemplate = SHIP_TEMPLATES[ShipClass.CargoShuttle];
    const starterShip: Ship = {
      id: `${company.id}-gen${(company.generation ?? 0) + 1}-ship-0`,
      name: starterTemplate.name,
      class: starterTemplate.class,
      cargoCapacity: starterTemplate.cargoCapacity,
      passengerCapacity: starterTemplate.passengerCapacity,
      speed: starterTemplate.speed,
      fuelEfficiency: starterTemplate.fuelEfficiency,
      reliability: starterTemplate.baseReliability,
      age: 0,
      condition: 100,
      purchaseCost: starterTemplate.purchaseCost,
      maintenanceCost: starterTemplate.baseMaintenance,
      assignedRouteId: null,
    };

    const startingCash =
      AI_STARTING_CASH * AI_REPLACEMENT_CASH_RATIO -
      starterTemplate.purchaseCost;

    const replacement: AICompany = {
      id: company.id, // reuse slot
      name,
      empireId,
      cash: startingCash,
      fleet: [starterShip],
      activeRoutes: [],
      reputation: 40, // slightly below average — they're newcomers
      totalCargoDelivered: 0,
      personality,
      bankrupt: false,
      bankruptTurn: undefined,
      generation: (company.generation ?? 0) + 1,
      ceoName: name,
      ceoPortrait: pickRandomPortrait(rng),
    };

    return replacement;
  });
}
