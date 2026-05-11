import type { Context } from "./context.js";
export interface GeneratorInfo {
    readonly id: string;
    readonly description?: string;
    readonly tags?: readonly string[];
}
export interface Generator<T, C = unknown> {
    readonly id: string;
    generate(ctx: Context<C>): T;
    describe?(): GeneratorInfo;
}
export type GeneratorLike<T, C = unknown> = Generator<T, C> | ((ctx: Context<C>) => T);
export declare function asGenerator<T, C = unknown>(g: GeneratorLike<T, C>, fallbackId?: string): Generator<T, C>;
export declare function nextAnonId(prefix?: string): string;
//# sourceMappingURL=generator.d.ts.map