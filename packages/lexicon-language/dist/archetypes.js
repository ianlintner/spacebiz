/**
 * Reusable phonotactic presets for culture definitions.
 * Cultures extend one of these and override specific fields.
 */
export const archetypes = {
    flowing: {
        classes: {
            C: ["l", "r", "n", "m", "w", "y"],
            V: ["a", "e", "i", "o", "u"],
        },
        syllables: [
            ["V", 1],
            ["C V", 3],
            ["V C", 2],
            ["C V V", 2],
            ["V V C", 1],
        ],
        wordShapes: [["1", 1], ["2", 3], ["3", 2], ["1-2", 1]],
    },
    guttural: {
        classes: {
            C: ["k", "g", "d", "t", "p", "b", "kh", "gh"],
            V: ["a", "o", "u"],
        },
        syllables: [
            ["C V C", 3],
            ["C V", 1],
            ["C C V C", 2],
        ],
        wordShapes: [["1", 2], ["2", 2], ["1-2", 1]],
    },
    clipped: {
        classes: {
            C: ["k", "t", "p", "s", "sh", "ch"],
            V: ["a", "i"],
        },
        syllables: [["C V C", 2], ["C V", 1]],
        wordShapes: [["1", 3], ["2", 1]],
    },
    sibilant: {
        classes: {
            C: ["s", "sh", "z", "zh", "ts", "ch", "j"],
            V: ["a", "e", "i", "o", "u"],
        },
        syllables: [
            ["C V", 2],
            ["C V C", 1],
            ["C V V", 2],
            ["C C V", 1],
        ],
        wordShapes: [["1", 1], ["2", 2], ["1-2", 1]],
    },
    resonant: {
        classes: {
            C: ["l", "r", "m", "n", "ng"],
            V: ["a", "e", "i", "o", "u"],
        },
        syllables: [
            ["C V C V", 2],
            ["C V C", 1],
            ["C V", 1],
        ],
        wordShapes: [["1", 1], ["2", 3]],
    },
};
//# sourceMappingURL=archetypes.js.map