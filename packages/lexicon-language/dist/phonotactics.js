import { constraintMatches } from "./glyphs.js";
/**
 * Generate a single word conforming to a glyph system.
 * Algorithm:
 * 1. Pick word shape (syllable count)
 * 2. For each syllable, pick syllable template
 * 3. For each class slot, pick a glyph
 * 4. Check constraints; redraw on violation
 * 5. Join and capitalize
 */
export function generateWord(glyphs, ctx) {
    // 1. Pick word shape
    const shapeCtx = ctx.child("shape");
    const shapeStr = pickWeighted(glyphs.wordShapes, shapeCtx);
    const syllableCount = parseWordShape(shapeStr, shapeCtx);
    // 2. Pick syllable templates and generate glyphs for each
    const syllables = [];
    for (let i = 0; i < syllableCount; i++) {
        const syllCtx = ctx.child(`syl:${i}`);
        const template = pickWeighted(glyphs.syllables, syllCtx);
        const classes = template.split(" ");
        const syllableGlyphs = generateSyllable(glyphs, classes, syllCtx);
        syllables.push(syllableGlyphs);
    }
    // 5. Join
    const word = syllables.join(glyphs.joiner ?? "");
    // 6. Capitalize
    return capitalize(word, glyphs, ctx);
}
function parseWordShape(shape, ctx) {
    // "1" -> 1, "2" -> 2, "1-2" -> random in [1,2]
    if (shape.includes("-")) {
        const [lo, hi] = shape.split("-").map(Number);
        return ctx.rng.nextInt(lo, hi + 1);
    }
    return Number(shape);
}
function generateSyllable(glyphs, classes, ctx) {
    const glyphSlots = [];
    for (let slot = 0; slot < classes.length; slot++) {
        const className = classes[slot];
        let glyph = pickGlyph(glyphs.classes[className], ctx.child(`slot:${slot}`));
        // Constraint checking with retries
        let retries = 0;
        while (retries < 8 && violatesConstraints(glyphs, [...glyphSlots, glyph], classes, slot)) {
            glyph = pickGlyph(glyphs.classes[className], ctx.child(`slot:${slot}:retry:${retries}`));
            retries++;
        }
        glyphSlots.push(glyph);
    }
    return glyphSlots.join("");
}
function violatesConstraints(glyphs, glyphsSoFar, classes, currentSlot) {
    if (!glyphs.constraints || glyphsSoFar.length < 2)
        return false;
    // Check constraints that end at or after the current position
    for (const constraint of glyphs.constraints) {
        const patternLen = constraint.pattern.length;
        const startIdx = Math.max(0, currentSlot + 1 - patternLen);
        for (let i = startIdx; i <= currentSlot - patternLen + 1; i++) {
            const classSeq = classes.slice(i, i + patternLen);
            if (constraintMatches(constraint.pattern, classSeq)) {
                const glyphSeq = glyphsSoFar.slice(i, i + patternLen);
                if (glyphSeq.length === patternLen) {
                    if (constraint.rule === "forbid")
                        return true;
                    if (typeof constraint.rule === "object") {
                        const count = glyphSeq.filter((g) => g === glyphSeq[0]).length;
                        if (count > constraint.rule.maxOccurrences)
                            return true;
                    }
                }
            }
        }
    }
    return false;
}
function pickGlyph(glyphs, ctx) {
    const idx = ctx.rng.nextInt(0, glyphs.length);
    return glyphs[idx];
}
function pickWeighted(items, ctx) {
    const totalWeight = items.reduce((sum, [, w]) => sum + w, 0);
    let roll = ctx.rng.nextInt(0, totalWeight);
    for (const [item, weight] of items) {
        if (roll < weight)
            return item;
        roll -= weight;
    }
    return items[items.length - 1][0];
}
function capitalize(word, glyphs, ctx) {
    if (!glyphs.joiner && word.length > 0) {
        // Default: capitalize first glyph (first character if it's a letter)
        const cap = word[0].toUpperCase();
        return cap + word.slice(1);
    }
    return word;
}
//# sourceMappingURL=phonotactics.js.map