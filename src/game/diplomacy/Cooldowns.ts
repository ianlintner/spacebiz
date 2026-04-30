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

export function decrementCooldowns(
  cooldowns: Record<string, number>,
  currentTurn: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(cooldowns)) {
    if (v > currentTurn) next[k] = v;
  }
  return next;
}
