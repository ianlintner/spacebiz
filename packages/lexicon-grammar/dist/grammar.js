import { buildAliasTable, sampleAlias, normalizeWeights } from "@lexicon/core";
import { builtinModifiers } from "./modifiers.js";
import { parse } from "./parser.js";
// ─── compile a single rule's value ───────────────────────────────────────
function compileRuleValue(value) {
    if (typeof value === "function") {
        return (ctx) => value(ctx);
    }
    if (typeof value === "string") {
        const ast = parse(value);
        return (ctx, locals) => evalNodes(ast, ctx, locals, this_);
    }
    if (Array.isArray(value)) {
        // string[] — uniform random pick
        const arr = value;
        if (arr.length === 0)
            return () => "";
        const asts = arr.map((s) => parse(s));
        return (ctx, locals) => {
            const idx = ctx.rng.nextInt(0, arr.length);
            const ast = asts[idx] ?? [];
            return evalNodes(ast, ctx, locals, this_);
        };
    }
    // Generator-like object
    if (typeof value === "object" && value !== null && "generate" in value && typeof value.generate === "function") {
        const gen = value;
        return (ctx) => gen.generate(ctx);
    }
    // Weighted record / array of {value,weight}
    const weighted = normalizeWeights(value);
    if (weighted.length === 0)
        return () => "";
    const table = buildAliasTable(weighted);
    // Pre-parse each branch.
    const asts = weighted.map((w) => parse(w.value));
    return (ctx, locals) => {
        // Use alias table only to find the index, then return the parsed AST.
        const picked = sampleAlias(table, ctx.rng);
        const idx = weighted.findIndex((w) => w.value === picked);
        const ast = asts[idx >= 0 ? idx : 0] ?? [];
        return evalNodes(ast, ctx, locals, this_);
    };
}
let this_ = null;
// ─── evaluate parsed nodes into a string ─────────────────────────────────
function evalNodes(nodes, ctx, locals, ec) {
    if (!ec)
        throw new Error("grammar: evaluation context missing");
    if (ec.depth > ec.maxDepth) {
        throw new Error(`grammar: recursion depth exceeded (${ec.maxDepth})`);
    }
    let out = "";
    let i = 0;
    for (const node of nodes) {
        // Sub-context per slot keeps positional determinism. Use `i` so that
        // adding text at the end of a template doesn't shift earlier slots.
        if (node.type === "text") {
            out += node.value;
        }
        else if (node.type === "raw") {
            out += node.value;
        }
        else {
            // Apply actions first: they push variables onto the local scope.
            for (const action of node.actions) {
                locals.vars.set(action.name, action.rule);
            }
            if (node.symbol === "__action__") {
                i++;
                continue;
            }
            const slotCtx = ctx.child(`g:${i}:${node.symbol}`);
            let value = expandSymbol(node.symbol, slotCtx, locals, ec);
            for (const mod of node.mods) {
                value = applyModifier(value, mod, ec);
            }
            out += value;
        }
        i++;
    }
    return out;
}
function expandSymbol(symbol, ctx, locals, ec) {
    // Local variables shadow rules.
    let scope = locals;
    while (scope) {
        const v = scope.vars.get(symbol);
        if (v !== undefined) {
            const next = { parent: scope, vars: new Map() };
            ec.depth++;
            try {
                return evalNodes(v, ctx, next, ec);
            }
            finally {
                ec.depth--;
            }
        }
        scope = scope.parent;
    }
    // Plugin lookup via colon prefix: `#markov:elvish#` → registry.get('markov:elvish')
    if (symbol.includes(":") && ec.registry?.has(symbol)) {
        const gen = ec.registry.get(symbol);
        return gen.generate(ctx);
    }
    const rule = ec.rules.get(symbol);
    if (!rule) {
        // Fall back to registry lookup by bare name.
        if (ec.registry?.has(symbol)) {
            return ec.registry.get(symbol).generate(ctx);
        }
        return `((${symbol}))`;
    }
    ec.depth++;
    try {
        return rule(ctx, { parent: locals, vars: new Map() });
    }
    finally {
        ec.depth--;
    }
}
function applyModifier(input, call, ec) {
    const fn = ec.modifiers[call.name];
    if (!fn)
        return input;
    return fn(input, ...call.args);
}
// ─── public factory ──────────────────────────────────────────────────────
export function grammar(rules, options = {}) {
    const startKey = options.start ?? (rules.start !== undefined ? "start" : "origin");
    const compiled = new Map();
    for (const [k, v] of Object.entries(rules)) {
        compiled.set(k, compileRuleValue(v));
    }
    const modifiers = { ...builtinModifiers, ...(options.modifiers ?? {}) };
    const id = options.id ?? "grammar";
    const maxDepth = options.maxDepth ?? 64;
    return {
        id,
        rules,
        generate(ctx) {
            return this.expand(`#${startKey}#`, ctx);
        },
        expand(template, ctx) {
            const ec = {
                modifiers,
                rules: compiled,
                registry: options.registry ?? ctx.registry,
                maxDepth,
                depth: 0,
            };
            const prev = this_;
            this_ = ec;
            try {
                const ast = parse(template);
                return evalNodes(ast, ctx, { parent: null, vars: new Map() }, ec);
            }
            finally {
                this_ = prev;
            }
        },
    };
}
//# sourceMappingURL=grammar.js.map