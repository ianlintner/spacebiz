export type Seed = string | number | bigint | RngState;
export interface RngState {
    readonly algo: "sfc32";
    readonly state: readonly [number, number, number, number];
    readonly origin: string;
}
export interface RNG {
    next(): number;
    nextU32(): number;
    nextInt(min: number, maxExclusive: number): number;
    nextRange(min: number, max: number): number;
    pick<T>(items: readonly T[]): T;
    state(): RngState;
    fork(label: string | number): RNG;
}
export declare class Sfc32 implements RNG {
    private a;
    private b;
    private c;
    private d;
    private readonly origin;
    private readonly originLabel;
    constructor(seed: Seed, originLabel?: string);
    nextU32(): number;
    next(): number;
    nextInt(min: number, maxExclusive: number): number;
    nextRange(min: number, max: number): number;
    pick<T>(items: readonly T[]): T;
    state(): RngState;
    fork(label: string | number): RNG;
}
export declare function createRng(seed: Seed): RNG;
//# sourceMappingURL=rng.d.ts.map