import type { Context } from "@lexicon/core";
import type { GlyphSystem } from "./types.js";
/**
 * Generate a single word conforming to a glyph system.
 * Algorithm:
 * 1. Pick word shape (syllable count)
 * 2. For each syllable, pick syllable template
 * 3. For each class slot, pick a glyph
 * 4. Check constraints; redraw on violation
 * 5. Join and capitalize
 */
export declare function generateWord(glyphs: GlyphSystem, ctx: Context): string;
//# sourceMappingURL=phonotactics.d.ts.map