import { type Context, type Generator, type Seed } from "@lexicon/core";
import { type TranslatedName } from "@lexicon/language";
/** @deprecated Use `humanoidName` instead. This Markov-based generator will be removed in v0.3. */
export declare const markovHumanoidName: Generator<string, unknown>;
/** @deprecated Use `insectoidName` instead. This Markov-based generator will be removed in v0.3. */
export declare const markovInsectoidName: Generator<string, unknown>;
/** @deprecated Use `aquaticName` instead. This Markov-based generator will be removed in v0.3. */
export declare const markovAquaticName: Generator<string, unknown>;
export declare const humanoidName: Generator<TranslatedName>;
export declare const insectoidName: Generator<TranslatedName>;
export declare const aquaticName: Generator<TranslatedName>;
export declare const synthName: Generator<TranslatedName>;
export declare const birdpeopleName: Generator<TranslatedName>;
export declare const rockpeopleName: Generator<TranslatedName>;
export declare const mycoidName: Generator<TranslatedName>;
export declare const mammalianName: Generator<TranslatedName>;
export declare const plantoidName: Generator<TranslatedName>;
export declare const starName: import("@lexicon/grammar").Grammar<unknown>;
export declare const planetName: import("@lexicon/grammar").Grammar<unknown>;
export declare const shipName: import("@lexicon/grammar").Grammar<unknown>;
export declare const megacorpName: import("@lexicon/grammar").Grammar<unknown>;
export declare const factionName: import("@lexicon/grammar").Grammar<unknown>;
export type Species = "human" | "humanoid" | "insectoid" | "aquatic" | "synth";
export declare const species: Generator<Species>;
export interface CrewMember {
    name: string;
    species: Species;
    role: string;
    callsign: string;
    homeworld: string;
}
export declare const crewMember: Generator<CrewMember>;
export interface StarSystem {
    name: string;
    star: string;
    planets: {
        name: string;
        type: string;
    }[];
    faction: string;
}
export declare const starSystem: Generator<StarSystem>;
export declare const weaponName: import("@lexicon/grammar").Grammar<unknown>;
export * as language from "./language/index.js";
export declare const generators: {
    readonly species: Generator<Species, unknown>;
    readonly crewMember: Generator<CrewMember, unknown>;
    readonly starName: import("@lexicon/grammar").Grammar<unknown>;
    readonly planetName: import("@lexicon/grammar").Grammar<unknown>;
    readonly starSystem: Generator<StarSystem, unknown>;
    readonly shipName: import("@lexicon/grammar").Grammar<unknown>;
    readonly megacorpName: import("@lexicon/grammar").Grammar<unknown>;
    readonly factionName: import("@lexicon/grammar").Grammar<unknown>;
    readonly weaponName: import("@lexicon/grammar").Grammar<unknown>;
    readonly humanoidName: Generator<TranslatedName, unknown>;
    readonly insectoidName: Generator<TranslatedName, unknown>;
    readonly aquaticName: Generator<TranslatedName, unknown>;
    readonly synthName: Generator<TranslatedName, unknown>;
    readonly callsign: import("@lexicon/grammar").Grammar<unknown>;
    readonly role: Generator<string, unknown>;
    readonly planetType: Generator<string, unknown>;
    readonly markovHumanoidName: Generator<string, unknown>;
    readonly markovInsectoidName: Generator<string, unknown>;
    readonly markovAquaticName: Generator<string, unknown>;
};
export interface ScifiAPI {
    crew: CrewMember;
    system: StarSystem;
    ship: () => string;
    star: () => string;
    planet: () => string;
    megacorp: () => string;
    faction: () => string;
    weapon: () => string;
    context: Context;
}
export interface ScifiEntry {
    withSeed(seed: Seed): ScifiAPI;
    generators: typeof generators;
}
export declare const scifi: ScifiEntry;
//# sourceMappingURL=index.d.ts.map