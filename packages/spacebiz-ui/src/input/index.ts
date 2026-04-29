export { Slider, quantizeSliderValue } from "./Slider.ts";
export type { SliderConfig } from "./Slider.ts";

/**
 * Checkbox, Toggle, and RadioGroup are available for use but currently
 * not integrated in the game. They're production-ready and can be used for:
 * - Checkbox: opt-in/out toggles, feature flags
 * - Toggle: on/off switches with custom labels (e.g., "Sound: ON" / "Sound: OFF")
 * - RadioGroup: single-choice selection across multiple options (e.g., difficulty)
 *
 * See styleguide/sections/legacy.ts for component examples and usage patterns.
 */
export { Checkbox } from "./Checkbox.ts";
export type { CheckboxConfig } from "./Checkbox.ts";

export { Toggle } from "./Toggle.ts";
export type { ToggleConfig } from "./Toggle.ts";

export { RadioGroup } from "./RadioGroup.ts";
export type { RadioGroupConfig, RadioOption } from "./RadioGroup.ts";

export { Stepper } from "./Stepper.ts";
export type { StepperConfig } from "./Stepper.ts";
export {
  clampStepperValue,
  nextRepeatInterval,
  STEPPER_TIMING,
} from "./stepperLogic.ts";

export { TextInput } from "./TextInput.ts";
export type { TextInputConfig, TextInputType } from "./TextInput.ts";

export { ColorSwatch } from "./ColorSwatch.ts";
export type { ColorSwatchConfig } from "./ColorSwatch.ts";
