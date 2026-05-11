import { type RNG, type Seed } from "./rng.js";
import type { Registry } from "./registry.js";
export interface Context<S = unknown> {
    readonly rng: RNG;
    readonly scope: readonly string[];
    readonly tags: ReadonlySet<string>;
    readonly locale?: string;
    readonly data: S;
    readonly registry?: Registry;
    child(label: string, extra?: ContextOverrides<S>): Context<S>;
    withTags(...tags: string[]): Context<S>;
    withData<S2>(data: S2): Context<S2>;
}
export interface ContextOverrides<S = unknown> {
    tags?: Iterable<string>;
    locale?: string;
    data?: S;
    registry?: Registry;
}
export interface CreateContextOptions<S = unknown> {
    seed: Seed;
    tags?: Iterable<string>;
    locale?: string;
    data?: S;
    registry?: Registry;
}
export declare function createContext<S = undefined>(opts: CreateContextOptions<S>): Context<S>;
//# sourceMappingURL=context.d.ts.map