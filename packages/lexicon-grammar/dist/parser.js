// Parser for Tracery-style grammar expansion strings.
// Accepts:
//   plain text
//   #symbol# / #symbol.modifier# / #symbol.mod1.mod2(arg1,arg2)#
//   [varName:#otherSymbol#] action assignments — pushed onto the symbol stack
//   nested: arbitrary text/refs allowed inside actions
export function parse(template) {
    const out = [];
    let i = 0;
    let textBuf = "";
    const flushText = () => {
        if (textBuf.length > 0) {
            out.push({ type: "text", value: textBuf });
            textBuf = "";
        }
    };
    while (i < template.length) {
        const ch = template[i];
        if (ch === "\\" && i + 1 < template.length) {
            // Escape next char.
            textBuf += template[i + 1];
            i += 2;
            continue;
        }
        if (ch === "#") {
            flushText();
            const end = findClosing(template, i + 1, "#");
            if (end < 0) {
                textBuf += "#";
                i++;
                continue;
            }
            const inner = template.slice(i + 1, end);
            out.push(parseRef(inner));
            i = end + 1;
            continue;
        }
        if (ch === "[") {
            flushText();
            const end = findClosing(template, i + 1, "]");
            if (end < 0) {
                textBuf += "[";
                i++;
                continue;
            }
            // [name:value] — value may itself be a template
            const inner = template.slice(i + 1, end);
            const colon = inner.indexOf(":");
            if (colon > 0) {
                const name = inner.slice(0, colon).trim();
                const valueRule = parse(inner.slice(colon + 1));
                // Standalone action: emits nothing, but action attaches to following text.
                // We wrap as a ref to a synthetic empty symbol carrying the action.
                out.push({
                    type: "ref",
                    symbol: "__action__",
                    mods: [],
                    actions: [{ name, rule: valueRule }],
                });
                i = end + 1;
                continue;
            }
            // Not a recognized action — treat as raw text.
            textBuf += `[${inner}]`;
            i = end + 1;
            continue;
        }
        textBuf += ch;
        i++;
    }
    flushText();
    return out;
}
function findClosing(template, start, close) {
    // Naive but matches Tracery's behavior for our grammar; supports escapes.
    for (let i = start; i < template.length; i++) {
        const ch = template[i];
        if (ch === "\\" && i + 1 < template.length) {
            i++;
            continue;
        }
        if (ch === close)
            return i;
    }
    return -1;
}
function parseRef(inner) {
    // inner like "name.mod1.mod2(a,b)" possibly preceded by "[var:rule]" actions
    let i = 0;
    const actions = [];
    while (inner[i] === "[") {
        const end = findClosing(inner, i + 1, "]");
        if (end < 0)
            break;
        const aInner = inner.slice(i + 1, end);
        const colon = aInner.indexOf(":");
        if (colon < 0)
            break;
        actions.push({
            name: aInner.slice(0, colon).trim(),
            rule: parse(aInner.slice(colon + 1)),
        });
        i = end + 1;
    }
    const rest = inner.slice(i);
    // rest = symbol(.mod(args))*
    const parts = splitTopLevel(rest, ".");
    const symbol = (parts[0] ?? "").trim();
    const mods = [];
    for (let k = 1; k < parts.length; k++) {
        const m = parts[k];
        const paren = m.indexOf("(");
        if (paren < 0) {
            mods.push({ name: m.trim(), args: [] });
        }
        else {
            const name = m.slice(0, paren).trim();
            const argEnd = m.lastIndexOf(")");
            const argStr = argEnd > paren ? m.slice(paren + 1, argEnd) : "";
            const args = argStr === "" ? [] : argStr.split(",").map((a) => a.trim());
            mods.push({ name, args });
        }
    }
    return { type: "ref", symbol, mods, actions };
}
function splitTopLevel(s, sep) {
    const out = [];
    let depth = 0;
    let buf = "";
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "(")
            depth++;
        else if (ch === ")")
            depth--;
        if (ch === sep && depth === 0) {
            out.push(buf);
            buf = "";
        }
        else {
            buf += ch;
        }
    }
    out.push(buf);
    return out;
}
//# sourceMappingURL=parser.js.map