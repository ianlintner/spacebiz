import type { DiplomacyActionKind } from "../../data/types.ts";

export function cooldownKey(
  kind: DiplomacyActionKind,
  targetId: string,
  subjectId?: string,
): string {
  return subjectId ? `${kind}:${targetId}:${subjectId}` : `${kind}:${targetId}`;
}

export function isOnCooldown(
  cooldowns: Record<string, number>,
  key: string,
  currentTurn: number,
): boolean {
  const until = cooldowns[key];
  return until !== undefined && until > currentTurn;
}

export function setCooldown(
  cooldowns: Record<string, number>,
  key: string,
  nextAvailableTurn: number,
): Record<string, number> {
  return { ...cooldowns, [key]: nextAvailableTurn };
}

/**
 * Cooldown values are absolute turn deadlines, not countdowns. This removes
 * entries whose deadline has passed; nothing is decremented.
 */
export function pruneExpiredCooldowns(
  cooldowns: Record<string, number>,
  currentTurn: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(cooldowns)) {
    if (v > currentTurn) next[k] = v;
  }
  return next;
}
