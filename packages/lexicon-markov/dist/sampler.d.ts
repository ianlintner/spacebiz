import type { Generator, RNG } from "@lexicon/core";
import { type MarkovModel } from "./model.js";
export interface SampleOptions {
    /** Hard cap on attempts before giving up. Default 200. */
    maxAttempts?: number;
    /** Override min/max length per call. */
    minLength?: number;
    maxLength?: number;
    /** Capitalize first letter of result. Default true. */
    capitalize?: boolean;
}
export declare function sample(model: MarkovModel, rng: RNG, options?: SampleOptions): string;
export interface MarkovGeneratorOptions extends SampleOptions {
    id?: string;
}
export declare function markov(model: MarkovModel, opts?: MarkovGeneratorOptions): Generator<string>;
//# sourceMappingURL=sampler.d.ts.map