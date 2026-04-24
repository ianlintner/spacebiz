import { AIPersonality, ContractStatus, ContractType } from "../../../data/types.ts";
import type {
  AICompany,
  Contract,
  GameState,
} from "../../../data/types.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// AI Contract Logic (Wave 3 — Track 3.2)
// ---------------------------------------------------------------------------

/**
 * Result of AI contract processing.
 * Returns the (possibly) updated company and the mutated contracts list.
 */
export interface AIContractResult {
  company: AICompany;
  updatedContracts: Contract[];
}

/**
 * Get the preferred contract type for an AI personality:
 * - AggressiveExpander: EmpireUnlock — expands reach
 * - SteadyHauler: TradeAlliance — reduces tariffs in home empire
 * - CherryPicker: ResearchCourier — more RP helps cherry-pick efficiency routes
 */
function getPreferredContractType(
  personality: (typeof AIPersonality)[keyof typeof AIPersonality],
): (typeof ContractType)[keyof typeof ContractType] {
  switch (personality) {
    case AIPersonality.AggressiveExpander:
      return ContractType.EmpireUnlock;
    case AIPersonality.SteadyHauler:
      return ContractType.TradeAlliance;
    case AIPersonality.CherryPicker:
      return ContractType.ResearchCourier;
    default:
      return ContractType.TradeAlliance;
  }
}

/**
 * Process AI contract decisions for one turn.
 *
 * - AI considers available contracts (status 'available', no aiCompanyId set)
 * - Personality-based preference filters contracts
 * - AI accepts at most 1 contract per turn
 * - AI must have enough cash to cover the deposit
 * - Accepted contracts are marked 'active' with aiCompanyId set
 * - AI-held contracts are removed from player's visible pool
 * - AI "completes" contracts automatically after durationTurns
 */
export function processAIContracts(
  company: AICompany,
  state: GameState,
  rng: SeededRNG,
): AIContractResult {
  // Tick down AI's already-active contracts (completion / cleanup)
  const updatedContracts = tickAIContracts(company, state.contracts);

  // How many active contracts does this AI currently hold?
  const aiActiveCount = updatedContracts.filter(
    (c) =>
      c.aiCompanyId === company.id &&
      c.status === ContractStatus.Active,
  ).length;

  // AI only accepts 1 new contract at a time, 1 per turn
  if (aiActiveCount >= 1) {
    return { company, updatedContracts };
  }

  // Find available contracts (not yet claimed by any AI or player)
  const available = updatedContracts.filter(
    (c) =>
      c.status === ContractStatus.Available &&
      !c.aiCompanyId,
  );
  if (available.length === 0) {
    return { company, updatedContracts };
  }

  // Sort by preference: preferred type first, then any
  const preferred = getPreferredContractType(company.personality);

  // Separate preferred from others
  const preferredContracts = available.filter((c) => c.type === preferred);
  const otherContracts = available.filter((c) => c.type !== preferred);

  // Pick a contract: first try preferred, then random from others
  let chosen: Contract | null = null;
  if (preferredContracts.length > 0) {
    chosen = rng.pick(preferredContracts);
  } else if (otherContracts.length > 0) {
    chosen = rng.pick(otherContracts);
  }

  if (!chosen) {
    return { company, updatedContracts };
  }

  // AI must have enough cash to cover the deposit
  if (company.cash < chosen.depositPaid) {
    return { company, updatedContracts };
  }

  // Accept the contract — mark it active with this AI's company id
  const newContracts = updatedContracts.map((c) =>
    c.id === chosen!.id
      ? {
          ...c,
          status: ContractStatus.Active as typeof c.status,
          aiCompanyId: company.id,
        }
      : c,
  );

  // Deduct deposit from AI cash
  const newCash = company.cash - chosen.depositPaid;
  const updatedCompany: AICompany = { ...company, cash: newCash };

  return { company: updatedCompany, updatedContracts: newContracts };
}

/**
 * Tick AI-held active contracts forward.
 * AI contracts complete automatically after durationTurns.
 * On completion: rewards cash to AI (handled in orchestrator summary).
 */
function tickAIContracts(
  company: AICompany,
  contracts: Contract[],
): Contract[] {
  return contracts.map((c) => {
    if (c.aiCompanyId !== company.id) return c;
    if (c.status !== ContractStatus.Active) return c;

    const turnsRemaining = c.turnsRemaining - 1;

    if (turnsRemaining <= 0) {
      // AI contract auto-completes
      return {
        ...c,
        turnsRemaining: 0,
        status: ContractStatus.Completed,
      };
    }

    return { ...c, turnsRemaining };
  });
}

/**
 * Apply AI contract rewards to the company.
 * Called after tickAIContracts completes contracts.
 */
export function applyAIContractRewards(
  company: AICompany,
  contracts: Contract[],
): AICompany {
  let cashGain = 0;
  let contractsCompleted = company.contractsCompleted ?? 0;

  for (const c of contracts) {
    if (c.aiCompanyId !== company.id) continue;
    if (c.status !== ContractStatus.Completed) continue;
    if (c.turnsRemaining !== 0) continue;

    // Only process contracts that just completed (turnsRemaining == 0 and was active)
    cashGain += c.rewardCash + c.depositPaid;
    contractsCompleted++;
  }

  if (cashGain === 0) return company;

  return {
    ...company,
    cash: company.cash + cashGain,
    contractsCompleted,
  };
}
