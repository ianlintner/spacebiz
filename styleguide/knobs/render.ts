import type { KnobDef, KnobValue, KnobValues } from "./types.ts";

/**
 * Render a stack of knob controls into a DOM container. Returns a teardown
 * callback that removes the controls and event listeners.
 *
 * DOM overlays are used (rather than Phaser-native controls) because the knob
 * panel sits *outside* the game canvas and needs to interact with native
 * keyboard/text input affordances. The styleguide canvas is centred, leaving
 * room on the right for a fixed-position panel.
 */
export function renderKnobs(
  parent: HTMLElement,
  knobs: ReadonlyArray<KnobDef>,
  values: KnobValues,
  onChange: (id: string, value: KnobValue) => void,
): () => void {
  // Clear existing
  while (parent.firstChild) parent.removeChild(parent.firstChild);

  if (knobs.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No knobs for this section.";
    empty.style.opacity = "0.5";
    empty.style.fontStyle = "italic";
    parent.appendChild(empty);
    return () => {
      while (parent.firstChild) parent.removeChild(parent.firstChild);
    };
  }

  const cleanups: Array<() => void> = [];

  for (const knob of knobs) {
    const row = document.createElement("div");
    row.className = "sg-knob-row";
    row.style.marginBottom = "12px";
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "4px";

    const label = document.createElement("label");
    label.textContent = knob.label;
    label.style.fontSize = "11px";
    label.style.opacity = "0.85";
    label.style.textTransform = "uppercase";
    label.style.letterSpacing = "0.5px";
    row.appendChild(label);

    const current = values[knob.id] ?? knob.default;
    const control = renderControl(knob, current, (v) => onChange(knob.id, v));
    row.appendChild(control.el);
    cleanups.push(control.dispose);

    parent.appendChild(row);
  }

  return () => {
    for (const fn of cleanups) fn();
    while (parent.firstChild) parent.removeChild(parent.firstChild);
  };
}

interface Control {
  el: HTMLElement;
  dispose: () => void;
}

function renderControl(
  knob: KnobDef,
  current: KnobValue,
  emit: (v: KnobValue) => void,
): Control {
  switch (knob.type) {
    case "boolean":
      return renderBoolean(Boolean(current), emit);
    case "number":
      return renderNumber(knob, Number(current), emit);
    case "select":
      return renderSelect(knob, String(current), emit);
    case "color":
      return renderColor(String(current), emit);
    case "string":
    default:
      return renderString(String(current), emit);
  }
}

function renderBoolean(
  current: boolean,
  emit: (v: KnobValue) => void,
): Control {
  const wrap = document.createElement("label");
  wrap.style.display = "inline-flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "6px";
  wrap.style.cursor = "pointer";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = current;
  const txt = document.createElement("span");
  txt.textContent = current ? "On" : "Off";
  const handler = () => {
    txt.textContent = input.checked ? "On" : "Off";
    emit(input.checked);
  };
  input.addEventListener("change", handler);
  wrap.appendChild(input);
  wrap.appendChild(txt);
  return {
    el: wrap,
    dispose: () => input.removeEventListener("change", handler),
  };
}

function renderNumber(
  knob: { min?: number; max?: number; step?: number },
  current: number,
  emit: (v: KnobValue) => void,
): Control {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(knob.min ?? 0);
  slider.max = String(knob.max ?? 100);
  slider.step = String(knob.step ?? 1);
  slider.value = String(current);
  slider.style.flex = "1";

  const readout = document.createElement("span");
  readout.style.minWidth = "44px";
  readout.style.textAlign = "right";
  readout.style.fontVariantNumeric = "tabular-nums";
  readout.textContent = String(current);

  const handler = () => {
    const v = Number(slider.value);
    readout.textContent = String(v);
    emit(v);
  };
  slider.addEventListener("input", handler);

  wrap.appendChild(slider);
  wrap.appendChild(readout);
  return {
    el: wrap,
    dispose: () => slider.removeEventListener("input", handler),
  };
}

function renderSelect(
  knob: { options: ReadonlyArray<{ value: string; label: string }> },
  current: string,
  emit: (v: KnobValue) => void,
): Control {
  const select = document.createElement("select");
  select.style.width = "100%";
  for (const opt of knob.options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === current) o.selected = true;
    select.appendChild(o);
  }
  const handler = () => emit(select.value);
  select.addEventListener("change", handler);
  return {
    el: select,
    dispose: () => select.removeEventListener("change", handler),
  };
}

function renderString(current: string, emit: (v: KnobValue) => void): Control {
  const input = document.createElement("input");
  input.type = "text";
  input.value = current;
  input.style.width = "100%";
  const handler = () => emit(input.value);
  input.addEventListener("input", handler);
  return {
    el: input,
    dispose: () => input.removeEventListener("input", handler),
  };
}

function renderColor(current: string, emit: (v: KnobValue) => void): Control {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";

  const swatch = document.createElement("input");
  swatch.type = "color";
  swatch.value = normaliseColor(current);

  const readout = document.createElement("span");
  readout.style.fontFamily = "monospace";
  readout.textContent = swatch.value;

  const handler = () => {
    readout.textContent = swatch.value;
    emit(swatch.value);
  };
  swatch.addEventListener("input", handler);

  wrap.appendChild(swatch);
  wrap.appendChild(readout);
  return {
    el: wrap,
    dispose: () => swatch.removeEventListener("input", handler),
  };
}

function normaliseColor(input: string): string {
  if (input.startsWith("#") && input.length === 7) return input.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(input)) return `#${input.toLowerCase()}`;
  return "#000000";
}
