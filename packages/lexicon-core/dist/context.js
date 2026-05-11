import { createRng } from "./rng.js";
class ContextImpl {
    rng;
    scope;
    tags;
    locale;
    data;
    registry;
    constructor(opts) {
        this.rng = opts.rng;
        this.scope = opts.scope;
        this.tags = opts.tags;
        if (opts.locale !== undefined)
            this.locale = opts.locale;
        this.data = opts.data;
        if (opts.registry !== undefined)
            this.registry = opts.registry;
    }
    child(label, extra) {
        return new ContextImpl({
            rng: this.rng.fork(label),
            scope: [...this.scope, label],
            tags: extra?.tags ? new Set([...this.tags, ...extra.tags]) : this.tags,
            locale: extra?.locale ?? this.locale,
            data: (extra?.data ?? this.data),
            registry: extra?.registry ?? this.registry,
        });
    }
    withTags(...tags) {
        return new ContextImpl({
            rng: this.rng,
            scope: this.scope,
            tags: new Set([...this.tags, ...tags]),
            locale: this.locale,
            data: this.data,
            registry: this.registry,
        });
    }
    withData(data) {
        return new ContextImpl({
            rng: this.rng,
            scope: this.scope,
            tags: this.tags,
            locale: this.locale,
            data,
            registry: this.registry,
        });
    }
}
export function createContext(opts) {
    return new ContextImpl({
        rng: createRng(opts.seed),
        scope: [],
        tags: new Set(opts.tags ?? []),
        locale: opts.locale,
        data: (opts.data ?? undefined),
        registry: opts.registry,
    });
}
//# sourceMappingURL=context.js.map