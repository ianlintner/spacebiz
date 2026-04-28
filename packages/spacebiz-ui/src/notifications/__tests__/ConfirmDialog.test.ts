import { describe, it, expect, beforeEach, vi } from "vitest";

// Modal is non-trivial to instantiate without a full Phaser scene, so we
// mock it with a tiny spy that captures the config and exposes hooks for
// firing onOk/onCancel/destroy.

interface CapturedConfig {
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  testId?: string;
  title?: string;
  body?: string;
}

interface FakeModal {
  config: CapturedConfig;
  show: () => void;
  destroyHandlers: Array<() => void>;
  once: (event: string, fn: () => void) => void;
  triggerDestroy: () => void;
}

const created: FakeModal[] = [];

vi.mock("../../Modal.ts", () => {
  class Modal implements FakeModal {
    config: CapturedConfig;
    destroyHandlers: Array<() => void> = [];
    constructor(_scene: unknown, config: CapturedConfig) {
      this.config = config;
      created.push(this);
    }
    show(): void {}
    once(event: string, fn: () => void): void {
      if (event === "destroy") this.destroyHandlers.push(fn);
    }
    triggerDestroy(): void {
      for (const h of this.destroyHandlers) h();
    }
  }
  return { Modal };
});

beforeEach(() => {
  created.length = 0;
});

describe("ConfirmDialog", () => {
  it("resolves true when the user confirms", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    const promise = ConfirmDialog.show({} as never, {
      title: "Sell ship?",
      message: "This cannot be undone.",
    });
    const modal = created[0];
    modal.config.onOk?.();
    await expect(promise).resolves.toBe(true);
  });

  it("resolves false when the user cancels", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    const promise = ConfirmDialog.show({} as never, {
      title: "Sell ship?",
      message: "This cannot be undone.",
    });
    created[0].config.onCancel?.();
    await expect(promise).resolves.toBe(false);
  });

  it("resolves false on modal destroy if not already settled", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    const promise = ConfirmDialog.show({} as never, {
      title: "?",
      message: "?",
    });
    created[0].triggerDestroy();
    await expect(promise).resolves.toBe(false);
  });

  it("only resolves once even if both callbacks fire", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    const promise = ConfirmDialog.show({} as never, {
      title: "?",
      message: "?",
    });
    const modal = created[0];
    modal.config.onOk?.();
    modal.config.onCancel?.();
    modal.triggerDestroy();
    await expect(promise).resolves.toBe(true);
  });

  it("invokes onConfirm / onCancel side-effect callbacks", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    ConfirmDialog.show({} as never, {
      title: "?",
      message: "?",
      onConfirm,
      onCancel,
    });
    created[0].config.onOk?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    ConfirmDialog.show({} as never, {
      title: "?",
      message: "?",
      onConfirm,
      onCancel,
    });
    created[1].config.onCancel?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses default labels and forwards custom ones", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    ConfirmDialog.show({} as never, { title: "t", message: "m" });
    expect(created[0].config.okText).toBe("Confirm");
    expect(created[0].config.cancelText).toBe("Cancel");

    ConfirmDialog.show({} as never, {
      title: "t",
      message: "m",
      confirmLabel: "Sell",
      cancelLabel: "Keep",
    });
    expect(created[1].config.okText).toBe("Sell");
    expect(created[1].config.cancelText).toBe("Keep");
  });

  it("derives a danger-prefixed testId for the danger kind", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.ts");
    ConfirmDialog.show({} as never, {
      title: "t",
      message: "m",
      kind: "danger",
    });
    expect(created[0].config.testId).toBe("confirm-danger");

    ConfirmDialog.show({} as never, { title: "t", message: "m" });
    expect(created[1].config.testId).toBe("confirm");
  });
});
