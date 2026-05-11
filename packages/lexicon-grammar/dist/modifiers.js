// Built-in modifiers, Tracery-compatible plus a few extras.
// A modifier is a pure (string, ...args) → string function.
const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const cap = (s) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);
const upper = (s) => s.toUpperCase();
const lower = (s) => s.toLowerCase();
const title = (s) => s.replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
const a = (s) => {
    if (!s)
        return s;
    const first = (s[0] ?? "").toLowerCase();
    return (VOWELS.has(first) ? "an " : "a ") + s;
};
const s = (input) => {
    if (!input)
        return input;
    if (/(s|sh|ch|x|z)$/i.test(input))
        return input + "es";
    if (/[^aeiou]y$/i.test(input))
        return input.slice(0, -1) + "ies";
    return input + "s";
};
const ed = (input) => {
    if (!input)
        return input;
    if (/e$/i.test(input))
        return input + "d";
    if (/[^aeiou]y$/i.test(input))
        return input.slice(0, -1) + "ied";
    return input + "ed";
};
const possessive = (input) => /s$/i.test(input) ? input + "'" : input + "'s";
const trim = (s) => s.trim();
const reverse = (s) => s.split("").reverse().join("");
const replace = (s, from = "", to = "") => s.split(from).join(to);
export const builtinModifiers = {
    cap,
    capitalize: cap,
    upper,
    uppercase: upper,
    lower,
    lowercase: lower,
    title,
    a,
    an: a,
    s,
    ed,
    possessive,
    trim,
    reverse,
    replace,
};
//# sourceMappingURL=modifiers.js.map