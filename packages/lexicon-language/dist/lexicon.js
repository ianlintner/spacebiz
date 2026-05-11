import { generateWord } from "./phonotactics.js";
/**
 * Build a deterministic, key-addressed lexicon for a culture.
 * Each meaning's conlang form is derived from a fork keyed on the meaning ID,
 * ensuring order-independence and patch stability.
 */
export function buildLexicon(culture, ctx) {
    const cultureCtx = ctx.child(`lang:${culture.id}`);
    const cache = new Map();
    // Build a flat map of all meanings from all packs
    const allMeanings = new Map();
    for (const pack of culture.meaningPacks) {
        for (const meaning of pack.meanings) {
            allMeanings.set(meaning.id, { class: meaning.class, tags: meaning.tags, label: meaning.label });
        }
    }
    return {
        cultureId: culture.id,
        formOf(meaningId) {
            let form = cache.get(meaningId);
            if (form !== undefined)
                return form;
            // Key-addressed fork: order-independent
            const wordCtx = cultureCtx.child(`word:${meaningId}`);
            form = generateWord(culture.glyphs, wordCtx);
            cache.set(meaningId, form);
            return form;
        },
        byClass(c, tag) {
            const result = [];
            for (const pack of culture.meaningPacks) {
                for (const meaning of pack.meanings) {
                    if (meaning.class !== c)
                        continue;
                    if (tag && !meaning.tags.includes(tag))
                        continue;
                    result.push(meaning);
                }
            }
            return result;
        },
        materialize() {
            const result = new Map();
            for (const meaningId of allMeanings.keys()) {
                result.set(meaningId, this.formOf(meaningId));
            }
            return result;
        },
    };
}
//# sourceMappingURL=lexicon.js.map