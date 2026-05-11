import { END, START } from "./model.js";
function isEntry(x) {
    return typeof x === "object" && x !== null && "word" in x;
}
export function train(corpus, options = {}) {
    const order = options.order ?? 3;
    const minLength = options.minLength ?? 3;
    const maxLength = options.maxLength ?? 14;
    const lowercase = options.lowercase ?? true;
    const pruneBelow = options.pruneBelow ?? 1;
    const entries = [];
    for (const e of corpus) {
        const word = isEntry(e) ? e.word : e;
        if (typeof word !== "string" || word.length === 0)
            continue;
        const w = isEntry(e) && typeof e.weight === "number" ? e.weight : 1;
        entries.push({ word: lowercase ? word.toLowerCase() : word, weight: w });
    }
    if (entries.length === 0)
        throw new Error("markov.train: empty corpus");
    const transitions = {};
    const bump = (ctx, ch, w) => {
        let row = transitions[ctx];
        if (!row) {
            row = {};
            transitions[ctx] = row;
        }
        row[ch] = (row[ch] ?? 0) + w;
    };
    for (const { word, weight } of entries) {
        // Each word contributes (n - START_PREFIX) edges plus the END edge.
        // Use progressively longer context up to `order`.
        for (let i = 0; i < word.length; i++) {
            const ctx = i === 0 ? START : word.slice(Math.max(0, i - order), i);
            bump(ctx, word[i], weight);
        }
        const tailCtx = word.slice(Math.max(0, word.length - order));
        bump(tailCtx, END, weight);
    }
    // Prune low counts.
    if (pruneBelow > 1) {
        for (const ctx of Object.keys(transitions)) {
            const row = transitions[ctx];
            for (const ch of Object.keys(row)) {
                if ((row[ch] ?? 0) < pruneBelow)
                    delete row[ch];
            }
            if (Object.keys(row).length === 0)
                delete transitions[ctx];
        }
    }
    // Build forbidden list (training words themselves) when requested.
    let forbidden;
    if (options.rejectSubstringsOfLength) {
        const minSub = options.rejectSubstringsOfLength;
        const set = new Set();
        for (const { word } of entries) {
            if (word.length >= minSub)
                set.add(word);
        }
        forbidden = [...set];
    }
    const model = {
        order,
        minLength,
        maxLength,
        transitions,
    };
    if (forbidden && forbidden.length > 0) {
        return { ...model, forbidden };
    }
    if (options.meta) {
        return { ...model, meta: options.meta };
    }
    return model;
}
//# sourceMappingURL=trainer.js.map