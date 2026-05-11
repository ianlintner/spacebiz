export function asGenerator(g, fallbackId = "anon") {
    if (typeof g === "function") {
        return { id: fallbackId, generate: g };
    }
    return g;
}
let anonCounter = 0;
export function nextAnonId(prefix = "anon") {
    return `${prefix}:${++anonCounter}`;
}
//# sourceMappingURL=generator.js.map