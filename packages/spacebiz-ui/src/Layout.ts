// Shared layout system — single source of truth for all scene positioning.
// Supports dynamic game dimensions for responsive aspect ratios.

// ── Fixed design constants ──────────────────────────────────────────────────

export const BASE_HEIGHT = 720;
export const MIN_WIDTH = 960;
export const MAX_WIDTH = 2400;

// ── Reactive layout metrics ─────────────────────────────────────────────────

export interface LayoutMetrics {
  gameWidth: number;
  gameHeight: number;
  maxContentWidth: number;
  sidebarWidth: number;
  contentGap: number;
  hudTopBarHeight: number;
  hudBottomBarHeight: number;
  navSidebarWidth: number;
  contentTop: number;
  contentHeight: number;
  contentLeft: number;
  sidebarLeft: number;
  mainContentLeft: number;
  mainContentWidth: number;
  fullContentLeft: number;
  fullContentWidth: number;
  isPortrait: boolean;
  isCompact: boolean;
}

function computeMetrics(w: number, h: number): LayoutMetrics {
  const isPortrait = h > w;
  const isCompact = w < 1100;

  const sidebarWidth = isCompact ? 0 : 240;
  const navSidebarWidth = isPortrait ? 0 : 56;
  const hudTopBarHeight = 56;
  const hudBottomBarHeight = 52;
  const contentGap = 12;

  // Scale content to fill available space, keeping small margins on each side.
  // At 1280 wide → 1100; at 1920 → 1720; at 960 → 860.
  const maxContentWidth = w - navSidebarWidth * 2 - 68;
  const contentLeft = Math.floor((w - maxContentWidth) / 2);

  const contentTop = hudTopBarHeight;
  const contentHeight = h - hudTopBarHeight - hudBottomBarHeight;

  const sidebarLeft = contentLeft;
  const mainContentLeft = isCompact
    ? contentLeft
    : sidebarLeft + sidebarWidth + contentGap;
  const mainContentWidth = isCompact
    ? maxContentWidth
    : maxContentWidth - sidebarWidth - contentGap;

  return {
    gameWidth: w,
    gameHeight: h,
    maxContentWidth,
    sidebarWidth,
    contentGap,
    hudTopBarHeight,
    hudBottomBarHeight,
    navSidebarWidth,
    contentTop,
    contentHeight,
    contentLeft,
    sidebarLeft,
    mainContentLeft,
    mainContentWidth,
    fullContentLeft: contentLeft,
    fullContentWidth: maxContentWidth,
    isPortrait,
    isCompact,
  };
}

let _metrics: LayoutMetrics = computeMetrics(1280, 720);

/** Get the current layout metrics (reactive to game size). */
export function getLayout(): LayoutMetrics {
  return _metrics;
}

/** Recalculate layout metrics for a new game size. */
export function updateLayout(width: number, height: number): void {
  _metrics = computeMetrics(width, height);
}

// ── Backward-compatible static constants (use getLayout() for new code) ─────

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const MAX_CONTENT_WIDTH = 1100;
export const SIDEBAR_WIDTH = 240;
export const CONTENT_GAP = 12;
export const HUD_TOP_BAR_HEIGHT = 56;
export const HUD_BOTTOM_BAR_HEIGHT = 52;
export const NAV_SIDEBAR_WIDTH = 56;
export const CONTENT_TOP = HUD_TOP_BAR_HEIGHT;
export const CONTENT_HEIGHT =
  GAME_HEIGHT - HUD_TOP_BAR_HEIGHT - HUD_BOTTOM_BAR_HEIGHT;
export const CONTENT_LEFT = Math.floor((GAME_WIDTH - MAX_CONTENT_WIDTH) / 2);
export const SIDEBAR_LEFT = CONTENT_LEFT;
export const MAIN_CONTENT_LEFT = SIDEBAR_LEFT + SIDEBAR_WIDTH + CONTENT_GAP;
export const MAIN_CONTENT_WIDTH =
  MAX_CONTENT_WIDTH - SIDEBAR_WIDTH - CONTENT_GAP;
export const FULL_CONTENT_LEFT = CONTENT_LEFT;
export const FULL_CONTENT_WIDTH = MAX_CONTENT_WIDTH;
