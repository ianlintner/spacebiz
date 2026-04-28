/* eslint-disable sft/require-widget-testid -- testId is exercised in dedicated cases; other cases construct Modals only to test non-widget behavior. */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const m = await import("./_phaserMock.ts");
  return m.phaserMockFactory();
});

import {
  createMockScene,
  type MockScene,
  type MockContainer,
  type MockRectangle,
  type MockNineslice,
} from "./_phaserMock.ts";
import { Modal } from "../../Modal.ts";
import { setWidgetHook, type WidgetRegistration } from "../../WidgetHooks.ts";

interface ModalShape {
  visible: boolean;
  list: Array<MockContainer | MockRectangle>;
  show(): void;
  hide(): void;
  destroy(fromScene?: boolean): void;
}

function findOverlay(modal: ModalShape): MockRectangle {
  // The first child added is the overlay rectangle.
  return modal.list[0] as MockRectangle;
}

function findPanel(modal: ModalShape): MockContainer {
  // The second child added is the panel container.
  return modal.list[1] as MockContainer;
}

describe("Modal", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene(800, 600);
    setWidgetHook(null);
  });

  it("starts hidden after construction", () => {
    const modal = new Modal(scene as never, {
      title: "Confirm",
      body: "Proceed?",
    }) as unknown as ModalShape;
    expect(modal.visible).toBe(false);
  });

  it("show() makes it visible and hide() hides it again", () => {
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
    }) as unknown as ModalShape;
    modal.show();
    expect(modal.visible).toBe(true);
    modal.hide();
    expect(modal.visible).toBe(false);
  });

  it("renders an OK button only when no onCancel is provided", () => {
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
    }) as unknown as ModalShape;
    const panel = findPanel(modal);
    const nineslices = panel.list.filter(
      (c) => (c as MockNineslice).type === "NineSlice",
    );
    // 1 panel bg + 1 OK button = 2 nineslices, no cancel.
    expect(nineslices.length).toBe(2);
  });

  it("renders both OK and Cancel buttons when onCancel is provided", () => {
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
      onCancel: () => {},
    }) as unknown as ModalShape;
    const panel = findPanel(modal);
    const nineslices = panel.list.filter(
      (c) => (c as MockNineslice).type === "NineSlice",
    );
    // 1 panel bg + 2 buttons = 3 nineslices.
    expect(nineslices.length).toBe(3);
  });

  it("backdrop click invokes onCancel and hides the modal", () => {
    const onCancel = vi.fn();
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
      onCancel,
    }) as unknown as ModalShape;
    modal.show();
    const overlay = findOverlay(modal);
    overlay.emit("pointerup");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(modal.visible).toBe(false);
  });

  it("ESC keydown fires onCancel and hides the modal", () => {
    const onCancel = vi.fn();
    const onOk = vi.fn();
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
      onOk,
      onCancel,
    }) as unknown as ModalShape;
    modal.show();
    const event = { code: "Escape", preventDefault: vi.fn() };
    scene.input.keyboard._emit(event);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOk).not.toHaveBeenCalled();
    expect(modal.visible).toBe(false);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("Enter keydown fires onOk and hides the modal", () => {
    const onOk = vi.fn();
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
      onOk,
    }) as unknown as ModalShape;
    modal.show();
    scene.input.keyboard._emit({ code: "Enter", preventDefault: () => {} });
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(modal.visible).toBe(false);
  });

  it("ignores keydown events while hidden", () => {
    const onCancel = vi.fn();
    new Modal(scene as never, {
      title: "T",
      body: "B",
      onCancel,
    });
    // Never shown; must ignore Escape.
    scene.input.keyboard._emit({ code: "Escape", preventDefault: () => {} });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("registers OK/cancel/close widgets when a hook is installed", () => {
    const registrations: WidgetRegistration[] = [];
    setWidgetHook((reg) => {
      registrations.push(reg);
      return () => {};
    });
    new Modal(scene as never, {
      title: "T",
      body: "B",
      onCancel: () => {},
      testId: "my-modal",
    });
    const ids = registrations.map((r) => r.testId).sort();
    expect(ids).toEqual(["my-modal-cancel", "my-modal-close", "my-modal-ok"]);
  });

  it("widget invoke() fires the registered callback only when shown", () => {
    let okReg: WidgetRegistration | null = null;
    setWidgetHook((reg) => {
      if (reg.testId === "modal-ok") okReg = reg;
      return () => {};
    });
    const onOk = vi.fn();
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
      onOk,
    }) as unknown as ModalShape;
    expect(okReg).not.toBeNull();
    // Modal still hidden — invoke should be a no-op.
    okReg!.invoke();
    expect(onOk).not.toHaveBeenCalled();

    modal.show();
    okReg!.invoke();
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it("destroy() unregisters keyboard listener", () => {
    const onCancel = vi.fn();
    const modal = new Modal(scene as never, {
      title: "T",
      body: "B",
      onCancel,
    }) as unknown as ModalShape;
    modal.show();
    modal.destroy();
    // Keyboard listener should be detached, so emit must not invoke onCancel.
    scene.input.keyboard._emit({ code: "Escape", preventDefault: () => {} });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
