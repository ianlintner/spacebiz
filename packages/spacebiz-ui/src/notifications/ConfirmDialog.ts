import type * as Phaser from "phaser";
import { Modal } from "../Modal.ts";

export type ConfirmDialogKind = "default" | "danger";

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: ConfirmDialogKind;
  width?: number;
  height?: number;
  testId?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Standardized confirm/cancel dialog. Composes the existing `Modal` so
 * styling stays in one place; adds a `Promise<boolean>` API for ergonomic
 * async usage.
 *
 * The `kind: 'danger'` variant is reserved for destructive actions and is
 * surfaced via the testId prefix (e.g. `confirm-danger-ok`). Theming for
 * the danger variant currently relies on the wording / context — the
 * underlying Modal API does not yet support per-button colour overrides.
 */
export class ConfirmDialog {
  /**
   * Show a confirm dialog and resolve a promise with the user's choice.
   * `true` if confirmed, `false` if cancelled or dismissed.
   */
  static show(
    scene: Phaser.Scene,
    config: ConfirmDialogConfig,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean): void => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const prefix =
        config.testId ??
        (config.kind === "danger" ? "confirm-danger" : "confirm");

      const modal = new Modal(scene, {
        title: config.title,
        body: config.message,
        okText: config.confirmLabel ?? "Confirm",
        cancelText: config.cancelLabel ?? "Cancel",
        width: config.width,
        height: config.height,
        testId: prefix,
        onOk: () => {
          config.onConfirm?.();
          settle(true);
        },
        onCancel: () => {
          config.onCancel?.();
          settle(false);
        },
      });
      modal.show();
      // If the modal is destroyed without either callback firing
      // (e.g. scene shutdown), resolve as cancelled so awaiters don't hang.
      modal.once("destroy", () => settle(false));
    });
  }
}
