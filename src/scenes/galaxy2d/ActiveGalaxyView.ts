// Module-level pointer to the currently-mounted galaxy view, plus the small
// set of helpers other scenes use to coordinate with it (hide while a content
// scene takes over, dim while a modal is up). Previously lived alongside the
// Three.js GalaxyView3D and operated via DOM canvas styling; since the galaxy
// is now a Phaser game object owned by GalaxyView2D, those helpers delegate
// to the view's own visibility/opacity methods.

import type { GalaxyView2D } from "./GalaxyView2D.ts";

let _activeView: GalaxyView2D | null = null;

export function getActiveGalaxyView(): GalaxyView2D | null {
  return _activeView;
}

export function setActiveGalaxyView(view: GalaxyView2D | null): void {
  _activeView = view;
}

/** Hide the galaxy while another content scene takes over the main viewport. */
export function setGalaxy3DVisible(visible: boolean): void {
  _activeView?.setVisible(visible);
}

/** Dim the galaxy behind modals so dialog content reads cleanly above it. */
export function setGalaxy3DDimmed(dimmed: boolean, opacity = 0.12): void {
  _activeView?.setCanvasOpacity(dimmed ? opacity : 1);
}
