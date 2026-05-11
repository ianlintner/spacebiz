import type { Context } from "@lexicon/core";
import type { Culture, TranslatedName } from "./types.js";
/**
 * Generate a name from a template for a given culture.
 * Selects meanings by class/tag, composes them, and returns form + translation.
 */
export declare function generateName(culture: Culture, nameKind: keyof Culture["templates"], ctx: Context): TranslatedName;
//# sourceMappingURL=templates.d.ts.map