import type { StandingTag } from "../../data/types.ts";

export function addTag(
  tags: readonly StandingTag[],
  tag: StandingTag,
): readonly StandingTag[] {
  return [...tags, tag];
}

/**
 * Replace any existing tag of the same kind with the new one. Use this for
 * singleton tags (RecentlyGifted, OweFavor, NonCompete, SuspectedSpy) where
 * stacking is meaningless and would just produce ghost tags that linger
 * past the intended expiry.
 *
 * `LeakedIntel` is the one tag where stacking is sometimes desirable
 * (multiple lenses surveilled in parallel) — use plain `addTag` for it.
 */
export function replaceTag(
  tags: readonly StandingTag[],
  tag: StandingTag,
): readonly StandingTag[] {
  return [...tags.filter((t) => t.kind !== tag.kind), tag];
}

export function removeTagsByKind(
  tags: readonly StandingTag[],
  kind: StandingTag["kind"],
): readonly StandingTag[] {
  return tags.filter((t) => t.kind !== kind);
}

export function hasTagOfKind(
  tags: readonly StandingTag[],
  kind: StandingTag["kind"],
): boolean {
  return tags.some((t) => t.kind === kind);
}

export function findTagOfKind<K extends StandingTag["kind"]>(
  tags: readonly StandingTag[],
  kind: K,
): Extract<StandingTag, { kind: K }> | undefined {
  return tags.find((t) => t.kind === kind) as
    | Extract<StandingTag, { kind: K }>
    | undefined;
}

export function expireTags(
  tags: readonly StandingTag[],
  currentTurn: number,
): readonly StandingTag[] {
  return tags.filter((t) => t.expiresOnTurn > currentTurn);
}
