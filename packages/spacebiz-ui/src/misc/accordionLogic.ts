/**
 * Pure helper for Accordion expansion logic. Lives in its own file so that
 * unit tests can import it without pulling in Phaser (which requires a DOM).
 *
 * Given the current set of expanded section indices, return the new set
 * after toggling `index`. In single-mode (`allowMultiple = false`), opening
 * a section closes all others.
 */
export function computeNextExpanded(
  current: ReadonlySet<number>,
  index: number,
  allowMultiple: boolean,
): Set<number> {
  const next = new Set(current);
  if (next.has(index)) {
    next.delete(index);
    return next;
  }
  if (!allowMultiple) {
    next.clear();
  }
  next.add(index);
  return next;
}
