import { describe, it, expect } from "vitest";
import { slugifyLabel } from "../../../packages/spacebiz-ui/src/WidgetHooks";

describe("slugifyLabel", () => {
  it("prefixes with btn- and kebab-cases the label", () => {
    expect(slugifyLabel("Build Route")).toBe("btn-build-route");
  });
  it("collapses punctuation and repeats", () => {
    expect(slugifyLabel("End   Turn!!")).toBe("btn-end-turn");
  });
  it("uses alternate prefix for non-button kinds", () => {
    expect(slugifyLabel("Close", "modal-close")).toBe("modal-close-close");
  });
  it("falls back to the bare prefix for an empty label", () => {
    expect(slugifyLabel("")).toBe("btn");
    expect(slugifyLabel("!!!")).toBe("btn");
  });
});
