import type * as Phaser from "phaser";

export type WidgetKind =
  | "button"
  | "modal-ok"
  | "modal-cancel"
  | "modal-close"
  | "tab";

export interface WidgetRegistration {
  testId: string;
  kind: WidgetKind;
  label: string;
  scene: Phaser.Scene;
  invoke: () => void;
  isEnabled: () => boolean;
  isVisible: () => boolean;
}

export type WidgetHookFn = (reg: WidgetRegistration) => () => void;

let hook: WidgetHookFn | null = null;

export function setWidgetHook(fn: WidgetHookFn | null): void {
  hook = fn;
}

export function registerWidget(reg: WidgetRegistration): (() => void) | null {
  return hook ? hook(reg) : null;
}

export function slugifyLabel(
  label: string,
  kind: WidgetKind = "button",
): string {
  const prefix = kind === "button" ? "btn" : kind;
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${prefix}-${slug}` : prefix;
}
