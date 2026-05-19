/**
 * Branch color palette for the Tech Tree.
 *
 * Domain-specific (not semantic), so these live alongside the legacy flat
 * Theme.colors map rather than under `color.*` semantic tokens.
 *
 * Used by:
 *   - TechGraphCanvas (node borders, glow, edges)
 *   - TechDetailCard / TechResearchedTable (branch chips)
 *   - TechBonusesPanel (source attribution)
 */
export const BRANCH_COLORS = {
  logistics: 0x88e0ff, // Cyan
  engineering: 0xfcd96f, // Gold
  intelligence: 0xff9ce0, // Pink
  crisis: 0xffaa66, // Orange
  diplomacy: 0x9cffb0, // Mint
  fleet: 0xc89cff, // Violet
} as const;

export type BranchId = keyof typeof BRANCH_COLORS;

export function getBranchColor(branchId: string): number {
  return (BRANCH_COLORS as Record<string, number>)[branchId] ?? 0x88aacc;
}
