import type { Generator } from "./generator.js";
export interface Registry {
    register<T>(gen: Generator<T>): void;
    get<T>(id: string): Generator<T>;
    has(id: string): boolean;
    resolve<T>(ref: string | Generator<T>): Generator<T>;
    list(): readonly string[];
}
export declare class RegistryImpl implements Registry {
    private readonly map;
    register<T>(gen: Generator<T>): void;
    get<T>(id: string): Generator<T>;
    has(id: string): boolean;
    resolve<T>(ref: string | Generator<T>): Generator<T>;
    list(): readonly string[];
}
export declare function createRegistry(): Registry;
//# sourceMappingURL=registry.d.ts.map