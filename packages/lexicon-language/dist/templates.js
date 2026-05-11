import { buildLexicon } from "./lexicon.js";
/**
 * Generate a name from a template for a given culture.
 * Selects meanings by class/tag, composes them, and returns form + translation.
 */
export function generateName(culture, nameKind, ctx) {
    const templates = culture.templates[nameKind];
    if (!templates || templates.length === 0) {
        throw new Error(`No templates for ${nameKind} in culture ${culture.id}`);
    }
    // Pick a template
    const template = pickWeighted(templates, ctx.child("template"));
    // Build lexicon
    const lexicon = buildLexicon(culture, ctx.child("lexicon"));
    // Render name from template
    const rendered = renderTemplate(template, culture, lexicon, ctx.child("render"));
    const translatedName = {
        form: rendered.form,
        translation: rendered.translation,
        language: culture.id,
        parts: rendered.parts,
        toString() {
            return this.form;
        },
    };
    return translatedName;
}
function renderTemplate(template, culture, lexicon, ctx) {
    if (template.kind === "literal") {
        return {
            form: template.form,
            translation: template.translation,
            parts: [{ form: template.form, meaning: template.translation }],
        };
    }
    // kind === "compose"
    const parts = [];
    const forms = [];
    const translations = [];
    for (let i = 0; i < template.parts.length; i++) {
        const part = template.parts[i];
        const partCtx = ctx.child(`part:${i}`);
        if ("literal" in part && part.literal !== undefined) {
            forms.push(part.literal);
            translations.push(part.translation ?? "");
            parts.push({ form: part.literal, meaning: part.translation ?? "" });
        }
        else if ("pick" in part) {
            // Pick a meaning matching class + tag
            const candidates = lexicon.byClass(part.pick, part.tag);
            if (candidates.length === 0) {
                throw new Error(`No meanings for class ${part.pick} tag ${part.tag} in ${culture.id}`);
            }
            const meaning = candidates[partCtx.rng.nextInt(0, candidates.length - 1)];
            const form = lexicon.formOf(meaning.id);
            const morpheme = part.capitalize ? capitalize(form) : form;
            forms.push(morpheme);
            translations.push(meaning.label ?? meaning.id);
            parts.push({ form: morpheme, meaning: meaning.label ?? meaning.id });
        }
    }
    const form = forms.join(template.sep ?? "");
    const translation = translations.join(template.sep ?? "-");
    return { form, translation, parts };
}
function capitalize(s) {
    if (s.length === 0)
        return s;
    return s[0].toUpperCase() + s.slice(1);
}
function pickWeighted(items, ctx) {
    const totalWeight = items.reduce((sum, [, w]) => sum + w, 0);
    let roll = ctx.rng.nextInt(0, totalWeight - 1);
    for (const [item, weight] of items) {
        if (roll < weight)
            return item;
        roll -= weight;
    }
    return items[items.length - 1][0];
}
//# sourceMappingURL=templates.js.map