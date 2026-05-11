function isWeighted(x) {
    return typeof x === "object" && x !== null && "value" in x && "weight" in x;
}
export function normalizeWeights(input) {
    if (Array.isArray(input)) {
        return input.map((entry) => {
            if (isWeighted(entry))
                return entry;
            return { value: entry, weight: 1 };
        });
    }
    // Record<string, number>
    const out = [];
    for (const [k, v] of Object.entries(input)) {
        if (typeof v !== "number" || !Number.isFinite(v) || v <= 0)
            continue;
        out.push({ value: k, weight: v });
    }
    return out;
}
// Vose's alias method — O(1) sampling after O(n) build.
export function buildAliasTable(input) {
    const weighted = normalizeWeights(input);
    if (weighted.length === 0)
        throw new Error("buildAliasTable: empty input");
    const n = weighted.length;
    const values = weighted.map((w) => w.value);
    const sum = weighted.reduce((s, w) => s + w.weight, 0);
    if (sum <= 0)
        throw new Error("buildAliasTable: total weight must be > 0");
    const prob = new Float64Array(n);
    const alias = new Int32Array(n);
    const scaled = weighted.map((w) => (w.weight * n) / sum);
    const small = [];
    const large = [];
    for (let i = 0; i < n; i++) {
        if ((scaled[i] ?? 0) < 1)
            small.push(i);
        else
            large.push(i);
    }
    while (small.length > 0 && large.length > 0) {
        const s = small.pop();
        const l = large.pop();
        prob[s] = scaled[s] ?? 0;
        alias[s] = l;
        scaled[l] = (scaled[l] ?? 0) + (scaled[s] ?? 0) - 1;
        if ((scaled[l] ?? 0) < 1)
            small.push(l);
        else
            large.push(l);
    }
    while (large.length > 0) {
        const l = large.pop();
        prob[l] = 1;
        alias[l] = l;
    }
    while (small.length > 0) {
        const s = small.pop();
        prob[s] = 1;
        alias[s] = s;
    }
    return { values, prob, alias };
}
export function sampleAlias(table, rng) {
    const n = table.values.length;
    const i = rng.nextInt(0, n);
    const r = rng.next();
    const idx = r < (table.prob[i] ?? 0) ? i : (table.alias[i] ?? i);
    return table.values[idx];
}
//# sourceMappingURL=sample.js.map