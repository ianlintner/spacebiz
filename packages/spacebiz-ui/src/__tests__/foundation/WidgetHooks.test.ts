import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as Phaser from "phaser";
import {
  setWidgetHook,
  registerWidget,
  slugifyLabel,
} from "../../WidgetHooks.ts";
import type { WidgetRegistration } from "../../WidgetHooks.ts";

function makeRegistration(
  overrides: Partial<WidgetRegistration> = {},
): WidgetRegistration {
  return {
    testId: "btn-default",
    kind: "button",
    label: "Default",
    scene: {} as unknown as Phaser.Scene,
    invoke: () => {},
    isEnabled: () => true,
    isVisible: () => true,
    ...overrides,
  };
}

describe("WidgetHooks", () => {
  beforeEach(() => {
    setWidgetHook(null);
  });

  describe("slugifyLabel", () => {
    it("prefixes button kinds with 'btn-'", () => {
      expect(slugifyLabel("Save Game")).toBe("btn-save-game");
      expect(slugifyLabel("Save Game", "button")).toBe("btn-save-game");
    });

    it("uses the kind itself as the prefix for non-button kinds", () => {
      expect(slugifyLabel("Confirm", "modal-ok")).toBe("modal-ok-confirm");
      expect(slugifyLabel("Cancel", "modal-cancel")).toBe(
        "modal-cancel-cancel",
      );
      expect(slugifyLabel("Close", "modal-close")).toBe("modal-close-close");
      expect(slugifyLabel("Routes", "tab")).toBe("tab-routes");
    });

    it("lowercases and replaces non-alphanumerics with single dashes", () => {
      expect(slugifyLabel("HELLO World!!")).toBe("btn-hello-world");
      expect(slugifyLabel("Buy / Sell")).toBe("btn-buy-sell");
      expect(slugifyLabel("100% Profit")).toBe("btn-100-profit");
    });

    it("strips leading and trailing dashes", () => {
      expect(slugifyLabel("--Hello--")).toBe("btn-hello");
      expect(slugifyLabel("***boom***")).toBe("btn-boom");
    });

    it("returns just the prefix when the label has no usable characters", () => {
      expect(slugifyLabel("***")).toBe("btn");
      expect(slugifyLabel("", "tab")).toBe("tab");
    });

    it("collapses runs of separators into single dashes", () => {
      expect(slugifyLabel("foo   bar___baz")).toBe("btn-foo-bar-baz");
    });
  });

  describe("registerWidget", () => {
    it("returns null when no hook is registered", () => {
      const result = registerWidget(makeRegistration());
      expect(result).toBeNull();
    });

    it("invokes the registered hook with the registration", () => {
      const hook = vi.fn(() => () => {});
      setWidgetHook(hook);
      const reg = makeRegistration({ testId: "btn-confirm", label: "Confirm" });

      registerWidget(reg);

      expect(hook).toHaveBeenCalledTimes(1);
      expect(hook).toHaveBeenCalledWith(reg);
    });

    it("returns the unregister function produced by the hook", () => {
      const unregister = vi.fn();
      setWidgetHook(() => unregister);

      const result = registerWidget(makeRegistration());

      expect(result).toBe(unregister);
      result?.();
      expect(unregister).toHaveBeenCalledTimes(1);
    });

    it("returns null again after the hook is cleared", () => {
      setWidgetHook(() => () => {});
      expect(registerWidget(makeRegistration())).not.toBeNull();
      setWidgetHook(null);
      expect(registerWidget(makeRegistration())).toBeNull();
    });
  });
});
