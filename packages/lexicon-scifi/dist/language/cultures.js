import { archetypes, coreMeanings } from "@lexicon/language";
import { scifiMeanings } from "./meanings.js";
export const humanoid = {
    id: "scifi.humanoid",
    glyphs: {
        ...archetypes.resonant,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "technology", capitalize: true },
                        { pick: "verb", tag: "action" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
    visualGlyphSystems: {
        holistic: {
            id: "humanoid.geometric",
            type: "conceptual",
            renderFormat: "canvas",
            mappingStrategy: "holistic",
            generator: {
                baseShapes: ["rect", "circle", "polygon"],
                complexity: "medium",
                symmetry: true,
                palette: ["#00BFFF", "#1E90FF"],
            },
            renderParams: {
                size: 48,
                strokeWidth: 3,
            },
        },
    },
};
export const insectoid = {
    id: "scifi.insectoid",
    glyphs: {
        ...archetypes.guttural,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "adjective", tag: "collective", capitalize: true },
                        { pick: "noun", tag: "collective" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
    visualGlyphSystems: {
        phonetic: {
            id: "insectoid.chitin",
            type: "alphabet",
            renderFormat: "svg",
            mappingStrategy: "phoneme",
            generator: {
                baseShapes: ["line", "arc", "polygon"],
                complexity: "complex",
                symmetry: false,
                palette: ["#2F4F4F", "#696969"],
            },
            renderParams: {
                size: 32,
                strokeWidth: 1.5,
            },
        },
    },
};
export const aquatic = {
    id: "scifi.aquatic",
    glyphs: {
        ...archetypes.flowing,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "biology", capitalize: true },
                        { pick: "adjective", tag: "biology" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
};
export const synth = {
    id: "scifi.synth",
    glyphs: {
        ...archetypes.clipped,
        joiner: "-",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "technology", capitalize: true },
                        { literal: "0", translation: "zero" },
                    ],
                    sep: "-",
                },
                1,
            ],
        ],
    },
};
export const birdpeople = {
    id: "scifi.birdpeople",
    glyphs: {
        ...archetypes.sibilant,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "flight", capitalize: true },
                        { pick: "noun", tag: "sound" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
};
export const rockpeople = {
    id: "scifi.rockpeople",
    glyphs: {
        ...archetypes.guttural,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "geology", capitalize: true },
                        { pick: "adjective", tag: "geology" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
};
export const mycoids = {
    id: "scifi.mycoids",
    glyphs: {
        ...archetypes.flowing,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "biology", capitalize: true },
                        { pick: "verb", tag: "growth" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
};
export const mammalian = {
    id: "scifi.mammalian",
    glyphs: {
        ...archetypes.resonant,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "nature", capitalize: true },
                        { pick: "adjective", tag: "nature" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
};
export const plantoid = {
    id: "scifi.plantoid",
    glyphs: {
        ...archetypes.flowing,
        joiner: "",
    },
    meaningPacks: [coreMeanings, scifiMeanings],
    templates: {
        given: [
            [
                {
                    kind: "compose",
                    parts: [
                        { pick: "noun", tag: "nature", capitalize: true },
                        { pick: "verb", tag: "growth" },
                    ],
                    sep: "",
                },
                1,
            ],
        ],
    },
};
//# sourceMappingURL=cultures.js.map