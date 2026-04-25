/**
 * Shared render depth constants for the entire game.
 * Scene stack order always beats in-scene depth, so these only apply
 * within a single scene. Use them everywhere instead of magic numbers.
 */

/** Parallax starfield — always underneath everything. */
export const DEPTH_STARFIELD = -100;

/** Floating nebulae, sector halos, decorative orbital rings. */
export const DEPTH_AMBIENT_MID = -50;

/** In-world game objects: systems, planets, route lines. */
export const DEPTH_CONTENT = 0;

/** Buttons, panels, and other UI elements. */
export const DEPTH_UI = 100;

/** Modals and dialogs — above regular UI. */
export const DEPTH_MODAL = 1000;

/** HUD top/bottom bars — always rendered above everything in their scene. */
export const DEPTH_HUD = 10000;
