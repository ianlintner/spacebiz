export type RenderFormat = "svg" | "unicode" | "canvas";
export type MappingStrategy = "phoneme" | "morpheme" | "holistic";
export interface Glyph {
    id: string;
    meaning?: string;
    svg?: string;
    canvasInstructions?: Array<{
        type: string;
        params: Array<number | string>;
    }>;
    unicode?: string;
}
export interface GlyphSet {
    phonetic?: Glyph[];
    conceptual?: Glyph[];
    holistic?: Glyph;
}
export interface VisualGlyphSystem {
    id: string;
    type: "alphabet" | "conceptual";
    renderFormat: RenderFormat;
    mappingStrategy: MappingStrategy;
    generator?: {
        baseShapes: Array<"rect" | "circle" | "line" | "arc" | "polygon">;
        complexity: "simple" | "medium" | "complex";
        symmetry: boolean;
        palette?: string[];
    };
    templates?: Array<{
        id: string;
        baseShape: "rect" | "circle" | "line";
        variants: number;
        modifiers: Array<"rotate" | "scale" | "stroke">;
    }>;
    unicodeMappings?: Record<string, string>;
    renderParams?: {
        size?: number;
        strokeWidth?: number;
        fallback?: string;
    };
}
/** Atomic glyph classes and their phonotactic rules. */
export interface GlyphSystem {
    /** Named classes of glyphs (e.g., C, V, sigil, mark). */
    classes: Record<string, readonly string[]>;
    /** Syllable templates: space-separated class names. e.g. "C V", "C V C", "sigil mark". */
    syllables: Array<[template: string, weight: number]>;
    /** Word shapes: syllable counts. e.g. "1", "2", "1-2" (range). */
    wordShapes: Array<[shape: string, weight: number]>;
    /** Optional phonotactic constraints. */
    constraints?: readonly Constraint[];
    /** Joiner between syllables. Default "". */
    joiner?: string;
}
/** Phonotactic constraint. */
export interface Constraint {
    /** Pattern of class names; "*" matches any. */
    pattern: readonly string[];
    /** "forbid" or { maxOccurrences }. */
    rule: "forbid" | {
        maxOccurrences: number;
    };
}
/** A semantic unit with stable identity. */
export interface Meaning {
    /** Stable identifier (never rename after release). */
    id: string;
    /** Grammatical class. */
    class: WordClass;
    /** Semantic tags for template filtering. */
    tags: readonly string[];
    /** Human-readable label. */
    label?: string;
}
export type WordClass = "noun" | "adjective" | "verb" | "particle";
/** Named collection of meanings. */
export interface MeaningPack {
    id: string;
    version: string;
    meanings: readonly Meaning[];
}
/** Lazy + eager lexicon for a culture. */
export interface Lexicon {
    readonly cultureId: string;
    formOf(meaningId: string): string;
    byClass(c: WordClass, tag?: string): readonly Meaning[];
    materialize(): ReadonlyMap<string, string>;
}
/** Culture: glyph system + meanings + templates. */
export interface Culture {
    id: string;
    glyphs: GlyphSystem;
    meaningPacks: readonly MeaningPack[];
    templates: NameTemplates;
    capitalize?: "first" | "all" | "none";
    visualGlyphSystems?: Record<string, VisualGlyphSystem>;
}
export interface NameTemplates {
    given: Array<[template: NameTemplate, weight: number]>;
    surname?: Array<[template: NameTemplate, weight: number]>;
    settlement?: Array<[template: NameTemplate, weight: number]>;
    mountain?: Array<[template: NameTemplate, weight: number]>;
    river?: Array<[template: NameTemplate, weight: number]>;
    forest?: Array<[template: NameTemplate, weight: number]>;
}
export type NameTemplate = {
    kind: "compose";
    parts: readonly TemplatePart[];
    sep?: string;
} | {
    kind: "literal";
    form: string;
    translation: string;
};
export type TemplatePart = {
    pick: WordClass;
    tag?: string;
    capitalize?: boolean;
} | {
    literal: string;
    translation?: string;
};
/** Output: conlang form + English translation. */
export interface TranslatedName {
    form: string;
    translation: string;
    language: string;
    parts?: readonly {
        form: string;
        meaning: string;
    }[];
    glyphs?: GlyphSet;
    toString(): string;
}
//# sourceMappingURL=types.d.ts.map