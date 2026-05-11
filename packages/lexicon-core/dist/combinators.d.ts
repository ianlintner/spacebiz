import type { Context } from "./context.js";
import { type Generator, type GeneratorLike } from "./generator.js";
import { type WeightInput } from "./sample.js";
export interface WeightedListOptions {
    id?: string;
}
export declare function weightedList<T>(input: WeightInput<T>, opts?: WeightedListOptions): Generator<T>;
export declare function oneOf<T>(...values: readonly T[]): Generator<T>;
export declare function oneOf<T>(values: WeightInput<T>): Generator<T>;
export type GeneratorChoice<T, C> = GeneratorLike<T, C> | {
    gen: GeneratorLike<T, C>;
    weight: number;
};
export declare function pickOf<T, C = unknown>(...choices: readonly GeneratorChoice<T, C>[]): Generator<T, C>;
export type CountSpec = number | {
    min: number;
    max: number;
};
export declare function repeat<T, C = unknown>(gen: GeneratorLike<T, C>, count: CountSpec): Generator<T[], C>;
export type Parts<T, C> = {
    readonly [K in keyof T]: GeneratorLike<T[K], C>;
};
export interface ComposeOptions<T, C> {
    id: string;
    parts: Parts<T, C> | ((ctx: Context<C>) => Parts<T, C>);
    assemble?: (parts: T, ctx: Context<C>) => T;
}
export declare function compose<T extends object, C = unknown>(opts: ComposeOptions<T, C>): Generator<T, C>;
export declare function map<A, B, C = unknown>(gen: GeneratorLike<A, C>, fn: (value: A, ctx: Context<C>) => B): Generator<B, C>;
export declare function chain<A, B, C = unknown>(gen: GeneratorLike<A, C>, fn: (value: A, ctx: Context<C>) => GeneratorLike<B, C>): Generator<B, C>;
export declare function constant<T>(value: T): Generator<T>;
export declare function intRange(min: number, maxInclusive: number): Generator<number>;
export declare function floatRange(min: number, max: number): Generator<number>;
//# sourceMappingURL=combinators.d.ts.map