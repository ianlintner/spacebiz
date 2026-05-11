import { END, START } from "./model.js";
function pickWeighted(rng, choices) {
    let total = 0;
    for (const k of Object.keys(choices))
        total += choices[k] ?? 0;
    if (total <= 0)
        return null;
    let r = rng.next() * total;
    for (const k of Object.keys(choices)) {
        r -= choices[k] ?? 0;
        if (r <= 0)
            return k;
    }
    // Floating point fallback
    const keys = Object.keys(choices);
    return keys[keys.length - 1] ?? null;
}
function nextContext(buf, order) {
    return buf.slice(Math.max(0, buf.length - order));
}
function violatesForbidden(s, forbidden) {
    if (!forbidden)
        return false;
    for (const f of forbidden) {
        if (s.length >= f.length && s.includes(f))
            return true;
    }
    return false;
}
export function sample(model, rng, options = {}) {
    const max = options.maxLength ?? model.maxLength;
    const min = options.minLength ?? model.minLength;
    const attempts = options.maxAttempts ?? 200;
    const cap = options.capitalize ?? true;
    for (let attempt = 0; attempt < attempts; attempt++) {
        let out = "";
        let ctx = START;
        let fail = false;
        for (let i = 0; i < max + 1; i++) {
            const row = model.transitions[ctx];
            if (!row) {
                // Back off to shorter context.
                let backoff = ctx.slice(1);
                let row2;
                while (backoff.length > 0) {
                    row2 = model.transitions[backoff];
                    if (row2)
                        break;
                    backoff = backoff.slice(1);
                }
                if (!row2) {
                    fail = true;
                    break;
                }
                const ch = pickWeighted(rng, row2);
                if (!ch || ch === END)
                    break;
                out += ch;
                ctx = nextContext(out, model.order);
                continue;
            }
            const ch = pickWeighted(rng, row);
            if (!ch) {
                fail = true;
                break;
            }
            if (ch === END) {
                if (out.length >= min)
                    break;
                // Force a non-END choice if the row has alternatives.
                const alt = {};
                let hasAlt = false;
                for (const k of Object.keys(row)) {
                    if (k !== END) {
                        alt[k] = row[k];
                        hasAlt = true;
                    }
                }
                if (!hasAlt) {
                    fail = true;
                    break;
                }
                const ch2 = pickWeighted(rng, alt);
                if (!ch2) {
                    fail = true;
                    break;
                }
                out += ch2;
                ctx = nextContext(out, model.order);
                continue;
            }
            out += ch;
            ctx = nextContext(out, model.order);
        }
        if (fail)
            continue;
        if (out.length < min)
            continue;
        if (out.length > max)
            continue;
        if (violatesForbidden(out, model.forbidden))
            continue;
        return cap && out.length > 0 ? out[0].toUpperCase() + out.slice(1) : out;
    }
    // Last-ditch fallback: deterministic but ugly. Should never hit unless model is degenerate.
    throw new Error(`markov.sample: exceeded ${attempts} attempts (model may be too constrained)`);
}
export function markov(model, opts = {}) {
    return {
        id: opts.id ?? "markov",
        generate(ctx) {
            return sample(model, ctx.rng, opts);
        },
    };
}
//# sourceMappingURL=sampler.js.map