import type { RNG } from "./rng.js";
export type Weighted<T> = {
    value: T;
    weight: number;
};
export type WeightInput<T> = readonly T[] | readonly Weighted<T>[] | Record<string, number>;
export interface AliasTable<T> {
    values: readonly T[];
    prob: Float64Array;
    alias: Int32Array;
}
export declare function normalizeWeights<T>(input: WeightInput<T>): Weighted<T>[];
export declare function buildAliasTable<T>(input: WeightInput<T>): AliasTable<T>;
export declare function sampleAlias<T>(table: AliasTable<T>, rng: RNG): T;
//# sourceMappingURL=sample.d.ts.map