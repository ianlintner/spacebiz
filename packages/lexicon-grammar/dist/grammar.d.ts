import type { Context, Generator, Registry, WeightInput } from "@lexicon/core";
import { type Modifier } from "./modifiers.js";
export type RuleValue<C = unknown> = string | readonly string[] | WeightInput<string> | Generator<string, C> | ((ctx: Context<C>) => string);
export type GrammarRules<C = unknown> = Record<string, RuleValue<C>>;
export interface GrammarOptions<C = unknown> {
    id?: string;
    start?: string;
    modifiers?: Record<string, Modifier>;
    registry?: Registry;
    maxDepth?: number;
}
export interface Grammar<C = unknown> extends Generator<string, C> {
    readonly id: string;
    readonly rules: GrammarRules<C>;
    generate(ctx: Context<C>): string;
    expand(template: string, ctx: Context<C>): string;
}
export declare function grammar<C = unknown>(rules: GrammarRules<C>, options?: GrammarOptions<C>): Grammar<C>;
//# sourceMappingURL=grammar.d.ts.map