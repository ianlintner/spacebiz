// Shared layout constants — single source of truth for all scene positioning
// Replaces hardcoded HUD_TOP = 60 duplicated across 7+ scene files

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Max width constraint prevents UI from stretching on ultrawide
export const MAX_CONTENT_WIDTH = 1100;

// Sidebar + content split
export const SIDEBAR_WIDTH = 240;
export const CONTENT_GAP = 12;

// HUD chrome areas
export const HUD_TOP_BAR_HEIGHT = 56;
export const HUD_BOTTOM_BAR_HEIGHT = 52;

// Left navigation sidebar (Paradox-style icon strip)
export const NAV_SIDEBAR_WIDTH = 56;

// Derived content area
export const CONTENT_TOP = HUD_TOP_BAR_HEIGHT;
export const CONTENT_HEIGHT =
  GAME_HEIGHT - HUD_TOP_BAR_HEIGHT - HUD_BOTTOM_BAR_HEIGHT; // 612

// Horizontal centering within max width
export const CONTENT_LEFT = Math.floor((GAME_WIDTH - MAX_CONTENT_WIDTH) / 2); // 90

// Sidebar geometry
export const SIDEBAR_LEFT = CONTENT_LEFT;

// Main content area (right of sidebar)
export const MAIN_CONTENT_LEFT = SIDEBAR_LEFT + SIDEBAR_WIDTH + CONTENT_GAP; // 342
export const MAIN_CONTENT_WIDTH =
  MAX_CONTENT_WIDTH - SIDEBAR_WIDTH - CONTENT_GAP; // 848

// Helper for scenes without sidebar (full max-width content)
export const FULL_CONTENT_LEFT = CONTENT_LEFT;
export const FULL_CONTENT_WIDTH = MAX_CONTENT_WIDTH;
