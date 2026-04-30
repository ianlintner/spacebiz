/**
 * Convert a 1-based turn number into in-game (quarter, year).
 * Turns 1–4 are Y1Q1–Q4, turns 5–8 are Y2Q1–Q4, etc.
 */
export function turnToQuarterYear(turn: number): {
  quarter: number;
  year: number;
} {
  return {
    quarter: ((turn - 1) % 4) + 1,
    year: Math.ceil(turn / 4),
  };
}

/** "Q1 Y1" — the short form used in HUD chrome and save status labels. */
export function formatTurnShort(turn: number): string {
  const { quarter, year } = turnToQuarterYear(turn);
  return `Q${quarter} Y${year}`;
}

/** "Q1 Year 1" — the long form used in the HUD top bar. */
export function formatTurnLong(turn: number): string {
  const { quarter, year } = turnToQuarterYear(turn);
  return `Q${quarter} Year ${year}`;
}
