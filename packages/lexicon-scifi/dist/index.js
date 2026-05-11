import { compose, createContext, intRange, oneOf, pickOf, weightedList, } from "@lexicon/core";
import { grammar, t } from "@lexicon/grammar";
import { markov, train } from "@lexicon/markov";
import { generateName } from "@lexicon/language";
import { humanoid, insectoid, aquatic, synth, birdpeople, rockpeople, mycoids, mammalian, plantoid } from "./language/cultures.js";
// ─── Corpora for alien-sounding names (deprecated) ──────────────────────
const alienHumanoid = [
    "tharin", "velkar", "morath", "zelath", "oberon", "kael", "jovan",
    "aldric", "varan", "sorin", "tarek", "lirin", "darian", "neris",
    "valos", "kyrin", "soren", "alaric", "balen", "corvan",
];
const alienInsectoid = [
    "kszzix", "vrazzk", "thrax", "zix", "ssari", "kreel", "vex",
    "qzar", "zikkar", "skrakk", "thixx", "vrak", "zzir",
];
const alienAquatic = [
    "thaal", "shalu", "moruun", "neeri", "ulira", "sshool", "lumai",
    "varum", "yulun", "talari", "muurin", "phelu", "soolen",
];
const humanoidModel = train(alienHumanoid, { order: 3, minLength: 4, maxLength: 9 });
const insectoidModel = train(alienInsectoid, { order: 2, minLength: 4, maxLength: 8 });
const aquaticModel = train(alienAquatic, { order: 3, minLength: 5, maxLength: 9 });
/** @deprecated Use `humanoidName` instead. This Markov-based generator will be removed in v0.3. */
export const markovHumanoidName = markov(humanoidModel, { id: "scifi.alien.humanoid" });
/** @deprecated Use `insectoidName` instead. This Markov-based generator will be removed in v0.3. */
export const markovInsectoidName = markov(insectoidModel, { id: "scifi.alien.insectoid" });
/** @deprecated Use `aquaticName` instead. This Markov-based generator will be removed in v0.3. */
export const markovAquaticName = markov(aquaticModel, { id: "scifi.alien.aquatic" });
// ─── Language-backed alien name generators ──────────────────────────────
export const humanoidName = {
    id: "scifi.humanoidName",
    generate(ctx) {
        return generateName(humanoid, "given", ctx);
    },
};
export const insectoidName = {
    id: "scifi.insectoidName",
    generate(ctx) {
        return generateName(insectoid, "given", ctx);
    },
};
export const aquaticName = {
    id: "scifi.aquaticName",
    generate(ctx) {
        return generateName(aquatic, "given", ctx);
    },
};
export const synthName = {
    id: "scifi.synthName",
    generate(ctx) {
        return generateName(synth, "given", ctx);
    },
};
export const birdpeopleName = {
    id: "scifi.birdpeopleName",
    generate(ctx) {
        return generateName(birdpeople, "given", ctx);
    },
};
export const rockpeopleName = {
    id: "scifi.rockpeopleName",
    generate(ctx) {
        return generateName(rockpeople, "given", ctx);
    },
};
export const mycoidName = {
    id: "scifi.mycoidName",
    generate(ctx) {
        return generateName(mycoids, "given", ctx);
    },
};
export const mammalianName = {
    id: "scifi.mammalianName",
    generate(ctx) {
        return generateName(mammalian, "given", ctx);
    },
};
export const plantoidName = {
    id: "scifi.plantoidName",
    generate(ctx) {
        return generateName(plantoid, "given", ctx);
    },
};
// ─── Star / planet names ──────────────────────────────────────────────────
const greekLetters = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
    "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Sigma", "Tau", "Omega",
];
const starProper = [
    "Achernar", "Altair", "Antares", "Arcturus", "Bellatrix", "Betelgeuse",
    "Canopus", "Capella", "Deneb", "Fomalhaut", "Procyon", "Regulus",
    "Rigel", "Sirius", "Spica", "Vega", "Algol", "Mira", "Polaris",
];
export const starName = grammar({
    start: { "#letter# #cluster#-#num#": 3, "#proper#": 2, "#proper# #suffix#": 1 },
    letter: greekLetters,
    cluster: ["Centauri", "Eridani", "Cygni", "Hydrae", "Lyrae", "Pavonis", "Reticuli", "Tucanae"],
    num: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"],
    proper: starProper,
    suffix: ["Prime", "Major", "Minor", "Secundus"],
}, { id: "scifi.star" });
const planetSuffixes = ["Prime", "II", "III", "IV", "V", "VI", "Minor", "Major"];
export const planetName = grammar({
    start: { "#stem#-#num#": 4, "#stem# #suffix#": 3, "#stem#": 2 },
    stem: [
        "Kepler", "Helios", "Aurelia", "Tarsis", "Vexar", "Zhul", "Korr",
        "Nephys", "Drakon", "Velura", "Tyrnos", "Xerath", "Voren", "Sulun",
    ],
    num: Array.from({ length: 12 }, (_, i) => String(i + 1)),
    suffix: planetSuffixes,
}, { id: "scifi.planet" });
// ─── Ship names ──────────────────────────────────────────────────────────
const shipPrefixes = ["ISS", "USS", "ESS", "TSV", "HMS", "FSF"];
const shipPoetic = [
    "Stardust", "Eternity", "Endeavor", "Defiance", "Vigilant", "Resolute",
    "Pathfinder", "Ascendant", "Horizon", "Aurora", "Perseverance",
    "Nightingale", "Wayfarer", "Silent Drift", "Last Light", "Iron Tide",
    "Ember", "Quicksilver", "Black Star", "Dauntless", "Solitude",
];
export const shipName = grammar({
    start: { "#prefix# #poetic#": 6, "#prefix# #adj.cap# #noun.cap#": 4 },
    prefix: shipPrefixes,
    poetic: shipPoetic,
    adj: ["lonely", "burning", "frozen", "crimson", "silent", "violent",
        "fading", "azure", "crooked", "wandering"],
    noun: ["wave", "blade", "comet", "phoenix", "harbinger", "spear",
        "shadow", "storm", "vow", "tide", "nova"],
}, { id: "scifi.ship" });
// ─── Megacorporation names ──────────────────────────────────────────────
export const megacorpName = grammar({
    start: { "#stem#-#stem#": 3, "#stem# #type#": 4, "#stem# & #stem#": 2 },
    stem: [
        "Helix", "Aether", "Solaris", "Drakon", "Apex", "Synth", "Cogent",
        "Zenith", "Vector", "Quantis", "Orion", "Pyron", "Lumen", "Orbital",
        "Genesys", "Pareto", "Nyx", "Atlas", "Cypher", "Tessera",
    ],
    type: [
        "Industries", "Dynamics", "Systems", "Holdings", "Solutions",
        "Group", "Corporation", "Worldwide", "Aerospace", "BioTech", "Robotics",
        "Heavy Industries", "Logistics",
    ],
}, { id: "scifi.megacorp" });
// ─── Faction / government ────────────────────────────────────────────────
export const factionName = grammar({
    start: { "The #adj.cap# #type#": 4, "#thing.cap# #type#": 3, "United #thing.cap# #type#": 2 },
    adj: ["Free", "Sovereign", "Outer", "Inner", "Crimson", "Imperial",
        "Vacuum", "Frontier", "Jovian"],
    thing: ["Worlds", "Stars", "Systems", "Frontier", "Drift", "Belt", "Spiral", "Reach"],
    type: ["Confederacy", "Coalition", "Alliance", "Pact", "Compact", "Republic",
        "Hegemony", "Imperium", "Federation", "Concord", "Sovereignty"],
}, { id: "scifi.faction" });
export const species = weightedList({ human: 4, humanoid: 4, insectoid: 2, aquatic: 2, synth: 1 }, { id: "scifi.species" });
const synthDesignation = grammar({
    start: { "#letters##num#": 5, "#word#-#num#": 2 },
    letters: ["NX", "AX", "ZR", "VK", "MK", "RX", "T-"],
    num: Array.from({ length: 100 }, (_, i) => String(i + 1).padStart(3, "0")),
    word: ["Sentinel", "Ranger", "Operative", "Scout", "Custodian"],
}, { id: "scifi.synth.designation" });
const humanModelMale = train([
    "marcus", "lukas", "kael", "rurik", "darius", "anton", "ezra", "soren",
    "milo", "viktor", "ander", "nikolai", "matias", "rohan", "jaxon",
], { order: 3, minLength: 3, maxLength: 8 });
const humanModelFemale = train([
    "lyra", "vesna", "ana", "noor", "kira", "mira", "nadia", "amara",
    "sasha", "elena", "iva", "yara", "lina", "tova", "siena",
], { order: 3, minLength: 3, maxLength: 8 });
const humanGiven = pickOf(markov(humanModelMale), markov(humanModelFemale));
const humanSurname = oneOf("Voss", "Kalra", "Okafor", "Marston", "Han", "Reyes", "Petrov", "Hayashi", "Chowdhury", "Nakamura", "Singh", "Beckett", "Drago", "Ortiz", "Kovac", "Yamada", "Ortega");
function speciesName(sp) {
    if (sp === "humanoid")
        return humanoidName;
    if (sp === "insectoid")
        return insectoidName;
    if (sp === "aquatic")
        return aquaticName;
    if (sp === "synth")
        return synthName;
    return {
        id: "scifi.alien.human",
        generate(ctx) {
            const g = humanGiven.generate(ctx.child("g"));
            const s = humanSurname.generate(ctx.child("s"));
            return `${g[0]?.toUpperCase()}${g.slice(1)} ${s}`;
        },
    };
}
const role = oneOf("Captain", "First Officer", "Pilot", "Engineer", "Medic", "Gunner", "Navigator", "Comms Officer", "Scientist", "Quartermaster", "Marine");
const callsign = grammar({
    start: { "#adj.cap#-#num#": 4, "#animal.cap#": 3, "#adj.cap# #animal.cap#": 2 },
    adj: ["red", "ghost", "blue", "iron", "silent", "lone", "swift"],
    animal: ["wolf", "hawk", "viper", "bear", "raven", "falcon", "fox"],
    num: Array.from({ length: 9 }, (_, i) => String(i + 1)),
}, { id: "scifi.callsign" });
export const crewMember = {
    id: "scifi.crewMember",
    generate(ctx) {
        const sp = species.generate(ctx.child("species"));
        const nameGen = speciesName(sp).generate(ctx.child("name"));
        // Convert TranslatedName or string to string
        const name = typeof nameGen === "string" ? nameGen : nameGen.form;
        const r = role.generate(ctx.child("role"));
        const c = callsign.generate(ctx.child("callsign"));
        const homeworld = planetName.generate(ctx.child("homeworld"));
        return { name, species: sp, role: r, callsign: c, homeworld };
    },
};
const planetType = weightedList({
    "rocky": 5, "gas giant": 3, "ice world": 2, "ocean": 1,
    "desert": 2, "jungle": 1, "volcanic": 1, "tidal-locked": 1, "ringed": 2,
}, { id: "scifi.planet.type" });
export const starSystem = {
    id: "scifi.starSystem",
    generate(ctx) {
        const star = starName.generate(ctx.child("star"));
        const numPlanets = ctx.child("count").rng.nextInt(2, 9);
        const planets = [];
        for (let i = 0; i < numPlanets; i++) {
            const sub = ctx.child(`planet:${i}`);
            planets.push({
                name: planetName.generate(sub.child("n")),
                type: planetType.generate(sub.child("t")),
            });
        }
        return {
            name: star,
            star,
            planets,
            faction: factionName.generate(ctx.child("faction")),
        };
    },
};
// ─── Tech / item ─────────────────────────────────────────────────────────
export const weaponName = grammar({
    start: { "#brand.cap# #model#": 4, "#brand.cap# #model# \"#nick#\"": 2 },
    brand: ["Kepler", "Aether", "Sovkom", "Drakon", "Apex", "MK", "Vector"],
    model: ["AR-17", "RX-9", "K-12 \"Hammer\"", "MV-3", "Rail-7", "Plasma-X", "G-19"],
    nick: ["Stinger", "Fang", "Whisper", "Thunder", "Reaper"],
}, { id: "scifi.weapon" });
// ─── Language submodule ──────────────────────────────────────────────────
export * as language from "./language/index.js";
// ─── Public API ──────────────────────────────────────────────────────────
export const generators = {
    species,
    crewMember,
    starName,
    planetName,
    starSystem,
    shipName,
    megacorpName,
    factionName,
    weaponName,
    humanoidName,
    insectoidName,
    aquaticName,
    synthName,
    callsign,
    role,
    planetType,
    // Deprecated generators (Markov-based)
    markovHumanoidName,
    markovInsectoidName,
    markovAquaticName,
};
export const scifi = {
    generators,
    withSeed(seed) {
        const root = createContext({ seed });
        let counter = 0;
        const sub = (label) => root.child(`${label}:${counter++}`);
        return {
            get crew() { return crewMember.generate(sub("crew")); },
            get system() { return starSystem.generate(sub("system")); },
            ship: () => shipName.generate(sub("ship")),
            star: () => starName.generate(sub("star")),
            planet: () => planetName.generate(sub("planet")),
            megacorp: () => megacorpName.generate(sub("megacorp")),
            faction: () => factionName.generate(sub("faction")),
            weapon: () => weaponName.generate(sub("weapon")),
            context: root,
        };
    },
};
//# sourceMappingURL=index.js.map