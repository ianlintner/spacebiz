/**
 * Knob system for the styleguide.
 *
 * A `KnobDef` declares a single interactive control rendered in the right-hand
 * "knobs" panel of the styleguide. Each section can declare its knobs and read
 * back the current values via the `KnobValues` map passed to `render`.
 */

export interface BooleanKnob {
  type: "boolean";
  id: string;
  label: string;
  default: boolean;
}

export interface NumberKnob {
  type: "number";
  id: string;
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface StringKnob {
  type: "string";
  id: string;
  label: string;
  default: string;
}

export interface SelectKnob {
  type: "select";
  id: string;
  label: string;
  default: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export interface ColorKnob {
  type: "color";
  id: string;
  label: string;
  /** Default colour as `#rrggbb`. */
  default: string;
}

export type KnobDef =
  | BooleanKnob
  | NumberKnob
  | StringKnob
  | SelectKnob
  | ColorKnob;

export type KnobValue = boolean | number | string;

export type KnobValues = Record<string, KnobValue>;

/** Build a `KnobValues` map from a list of `KnobDef`s using each knob's default. */
export function buildDefaultKnobValues(
  knobs: ReadonlyArray<KnobDef> | undefined,
): KnobValues {
  const out: KnobValues = {};
  if (!knobs) return out;
  for (const k of knobs) out[k.id] = k.default;
  return out;
}
