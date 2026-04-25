import { describe, it, expect } from "vitest";
import {
  BASE_HEIGHT,
  MIN_WIDTH,
  MAX_WIDTH,
  getLayout,
  updateLayout,
} from "../Layout.ts";

describe("Layout metrics", () => {
  it("exposes the canonical design constants", () => {
    expect(BASE_HEIGHT).toBe(720);
    expect(MIN_WIDTH).toBe(960);
    expect(MAX_WIDTH).toBe(2400);
  });

  it("computes positive, in-bounds anchors at the legacy 1280x720 size", () => {
    updateLayout(1280, 720);
    const L = getLayout();
    expect(L.gameWidth).toBe(1280);
    expect(L.gameHeight).toBe(720);
    expect(L.contentLeft).toBeGreaterThanOrEqual(0);
    expect(L.maxContentWidth).toBeGreaterThan(0);
    expect(L.contentLeft + L.maxContentWidth).toBeLessThanOrEqual(L.gameWidth);
    expect(L.mainContentWidth).toBeGreaterThan(0);
    expect(L.contentHeight).toBeGreaterThan(0);
  });

  it("centers the content area at the previous HD ceiling (1920x720)", () => {
    updateLayout(1920, 720);
    const L = getLayout();
    expect(L.contentLeft).toBeGreaterThan(0);
    expect(L.maxContentWidth).toBe(1920 - L.navSidebarWidth * 2 - 68);
    expect(L.contentLeft + L.maxContentWidth).toBeLessThanOrEqual(1920);
    expect(L.mainContentLeft).toBeGreaterThan(L.sidebarLeft);
    expect(L.mainContentLeft + L.mainContentWidth).toBeLessThanOrEqual(1920);
  });

  it("keeps every anchor on-canvas at the new 2400x720 maximum", () => {
    updateLayout(2400, 720);
    const L = getLayout();
    expect(L.gameWidth).toBe(2400);
    expect(L.maxContentWidth).toBeGreaterThan(0);
    expect(L.maxContentWidth).toBeLessThan(2400);
    expect(L.contentLeft).toBeGreaterThanOrEqual(0);
    expect(L.contentLeft + L.maxContentWidth).toBeLessThanOrEqual(2400);
    expect(L.mainContentLeft).toBeGreaterThan(0);
    expect(L.mainContentWidth).toBeGreaterThan(0);
    expect(L.mainContentLeft + L.mainContentWidth).toBeLessThanOrEqual(2400);
    expect(L.isCompact).toBe(false);
    expect(L.isPortrait).toBe(false);
  });

  it("collapses the sidebar in compact mode (under 1100 wide)", () => {
    updateLayout(1000, 720);
    const L = getLayout();
    expect(L.isCompact).toBe(true);
    expect(L.sidebarWidth).toBe(0);
    expect(L.mainContentLeft).toBe(L.contentLeft);
    expect(L.mainContentWidth).toBe(L.maxContentWidth);
  });
});
