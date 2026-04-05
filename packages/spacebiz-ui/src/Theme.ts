export interface ThemeConfig {
  colors: {
    background: number;
    panelBg: number;
    panelBorder: number;
    text: number;
    textDim: number;
    accent: number;
    accentHover: number;
    profit: number;
    loss: number;
    warning: number;
    buttonBg: number;
    buttonHover: number;
    buttonPressed: number;
    buttonDisabled: number;
    scrollbarTrack: number;
    scrollbarThumb: number;
    headerBg: number;
    rowEven: number;
    rowOdd: number;
    rowHover: number;
    modalOverlay: number;
  };
  fonts: {
    heading: { size: number; family: string };
    body: { size: number; family: string };
    caption: { size: number; family: string };
    value: { size: number; family: string };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  panel: {
    borderWidth: number;
    cornerRadius: number;
    titleHeight: number;
  };
  button: {
    height: number;
    minWidth: number;
    borderWidth: number;
  };
  glow: {
    width: number;
    alpha: number;
    activeAlpha: number;
    pulseMin: number;
    pulseMax: number;
  };
  glass: {
    bgAlpha: number;
    gradientSteps: number;
    topTint: number;
    bottomTint: number;
    innerBorderAlpha: number;
  };
  chamfer: {
    size: number;
  };
  ambient: {
    /** Fastest twinkle cycle half-duration (ms). */
    starTwinkleDurationMin: number;
    /** Slowest twinkle cycle half-duration (ms). */
    starTwinkleDurationMax: number;
    /** Slow tint-color shift half-cycle per star (ms). */
    starShimmerDuration: number;
    /** Route-line breathing half-cycle (ms). */
    routePulseDuration: number;
    /** Route-line minimum alpha. */
    routePulseAlphaMin: number;
    /** Route-line maximum alpha. */
    routePulseAlphaMax: number;
    /** Route flow-pip travel time origin→dest (ms). */
    routeFlowDuration: number;
    /** Panel idle glow half-cycle (ms). */
    panelIdlePulseDuration: number;
    /** Button idle accent shimmer half-cycle (ms). */
    buttonIdleShimmerDuration: number;
    /** Orbital decoration full-rotation duration (ms). */
    orbitalRotationDuration: number;
  };
}

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    background: 0x0a0a1a,
    panelBg: 0x111128,
    panelBorder: 0x2a2a5a,
    text: 0xe0e0ff,
    textDim: 0x9999bb,
    accent: 0x00ffcc,
    accentHover: 0x33ffdd,
    profit: 0x00ff88,
    loss: 0xff6666,
    warning: 0xffaa00,
    buttonBg: 0x1a1a40,
    buttonHover: 0x2a2a60,
    buttonPressed: 0x0a0a30,
    buttonDisabled: 0x151530,
    scrollbarTrack: 0x2a2a4a,
    scrollbarThumb: 0x3a3a6a,
    headerBg: 0x1a1a3a,
    rowEven: 0x111128,
    rowOdd: 0x1a1a45,
    rowHover: 0x1a1a44,
    modalOverlay: 0x000000,
  },
  fonts: {
    heading: { size: 24, family: "monospace" },
    body: { size: 16, family: "monospace" },
    caption: { size: 12, family: "monospace" },
    value: { size: 18, family: "monospace" },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  panel: { borderWidth: 2, cornerRadius: 4, titleHeight: 36 },
  button: { height: 40, minWidth: 120, borderWidth: 2 },
  glow: {
    width: 6,
    alpha: 0.25,
    activeAlpha: 0.5,
    pulseMin: 0.22,
    pulseMax: 0.4,
  },
  glass: {
    bgAlpha: 0.75,
    gradientSteps: 8,
    topTint: 0x080818,
    bottomTint: 0x181838,
    innerBorderAlpha: 0.3,
  },
  chamfer: {
    size: 8,
  },
  ambient: {
    starTwinkleDurationMin: 2000,
    starTwinkleDurationMax: 6000,
    starShimmerDuration: 12000,
    routePulseDuration: 3000,
    routePulseAlphaMin: 0.35,
    routePulseAlphaMax: 0.55,
    routeFlowDuration: 3500,
    panelIdlePulseDuration: 4000,
    buttonIdleShimmerDuration: 3000,
    orbitalRotationDuration: 90000,
  },
};

let currentTheme: ThemeConfig = DEFAULT_THEME;

export function getTheme(): ThemeConfig {
  return currentTheme;
}

export function setTheme(theme: ThemeConfig): void {
  currentTheme = theme;
}

export function colorToString(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

export function colorWithAlpha(
  color: number,
  alpha: number,
): { color: number; alpha: number } {
  return { color, alpha };
}

/** Interpolate between two hex colors. t=0 returns c1, t=1 returns c2. */
export function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}
