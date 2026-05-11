import type { Context } from "@lexicon/core";
import type { Culture, Lexicon } from "./types.js";
/**
 * Build a deterministic, key-addressed lexicon for a culture.
 * Each meaning's conlang form is derived from a fork keyed on the meaning ID,
 * ensuring order-independence and patch stability.
 */
export declare function buildLexicon(culture: Culture, ctx: Context): Lexicon;
//# sourceMappingURL=lexicon.d.ts.map