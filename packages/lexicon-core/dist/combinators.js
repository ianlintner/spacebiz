import { asGenerator, nextAnonId } from "./generator.js";
import { buildAliasTable, normalizeWeights, sampleAlias } from "./sample.js";
export function weightedList(input, opts = {}) {
    const table = buildAliasTable(input);
    return {
        id: opts.id ?? nextAnonId("weightedList"),
        generate(ctx) {
            return sampleAlias(table, ctx.rng);
        },
    };
}
export function oneOf(...args) {
    const input = args.length === 1 && typeof args[0] === "object" && args[0] !== null
        ? args[0]
        : args;
    return weightedList(input);
}
export function pickOf(...choices) {
    const normalized = choices.map((c, i) => {
        if (typeof c === "object" && c !== null && "gen" in c && "weight" in c) {
            return { value: asGenerator(c.gen, `pickOf:${i}`), weight: c.weight };
        }
        return { value: asGenerator(c, `pickOf:${i}`), weight: 1 };
    });
    const table = buildAliasTable(normalized);
    return {
        id: nextAnonId("pickOf"),
        generate(ctx) {
            const chosen = sampleAlias(table, ctx.rng);
            return chosen.generate(ctx.child(`choice:${chosen.id}`));
        },
    };
}
export function repeat(gen, count) {
    const inner = asGenerator(gen, "repeat:inner");
    return {
        id: nextAnonId("repeat"),
        generate(ctx) {
            const n = typeof count === "number"
                ? count
                : ctx.rng.fork("count").nextInt(count.min, count.max + 1);
            const out = [];
            for (let i = 0; i < n; i++) {
                out.push(inner.generate(ctx.child(`i:${i}`)));
            }
            return out;
        },
    };
}
export function compose(opts) {
    return {
        id: opts.id,
        generate(ctx) {
            const parts = typeof opts.parts === "function" ? opts.parts(ctx) : opts.parts;
            const out = {};
            for (const key of Object.keys(parts)) {
                const child = asGenerator(parts[key], `${opts.id}:${String(key)}`);
                out[key] = child.generate(ctx.child(String(key)));
            }
            return opts.assemble ? opts.assemble(out, ctx) : out;
        },
    };
}
// ─── map / chain ──────────────────────────────────────────────────────────
export function map(gen, fn) {
    const inner = asGenerator(gen, "map:inner");
    return {
        id: nextAnonId("map"),
        generate(ctx) {
            return fn(inner.generate(ctx), ctx);
        },
    };
}
export function chain(gen, fn) {
    const inner = asGenerator(gen, "chain:inner");
    return {
        id: nextAnonId("chain"),
        generate(ctx) {
            const a = inner.generate(ctx.child("a"));
            const next = asGenerator(fn(a, ctx), "chain:b");
            return next.generate(ctx.child("b"));
        },
    };
}
// ─── constant ─────────────────────────────────────────────────────────────
export function constant(value) {
    return { id: nextAnonId("constant"), generate: () => value };
}
// ─── intRange / floatRange ────────────────────────────────────────────────
export function intRange(min, maxInclusive) {
    return {
        id: nextAnonId("intRange"),
        generate: (ctx) => ctx.rng.nextInt(min, maxInclusive + 1),
    };
}
export function floatRange(min, max) {
    return {
        id: nextAnonId("floatRange"),
        generate: (ctx) => ctx.rng.nextRange(min, max),
    };
}
//# sourceMappingURL=combinators.js.map