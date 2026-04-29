/**
 * Theme system for @spacebiz/ui.
 *
 * Two color APIs coexist intentionally:
 *
 *   - `colors` (flat / legacy): the original palette used by the rest of
 *     the codebase. Stable. Do not remove fields without migrating callers.
 *
 *   - `color` (semantic / new): a structured set of intent-bearing tokens
 *     organized as `surface`, `text`, `border`, `accent`. New components and
 *     migrations should prefer these — they are theme-variant aware (light,
 *     dark, high-contrast all share the same shape).
 *
 * Both are populated for every theme variant; `darkTheme` matches the
 * existing palette so visuals are unchanged when no theme switch happens.
 */

export interface SemanticColorTokens {
  surface: {
    /** Default panel / scene background. */
    default: number;
    /** Slightly elevated surface (cards, raised panels, header bars). */
    raised: number;
    /** Slightly recessed surface (table even rows, scrollbar tracks). */
    sunken: number;
    /** Surface under hover (rows, buttons). */
    hover: number;
    /** Surface during press / active state. */
    active: number;
    /** Surface for disabled controls. */
    disabled: number;
  };
  text: {
    /** Primary readable text. */
    primary: number;
    /** Secondary / supporting text. */
    secondary: number;
    /** De-emphasized helper text (placeholder, captions). */
    muted: number;
    /** Text on a strongly accented or inverted surface. */
    inverse: number;
    /** Hyperlink-style text. */
    link: number;
    /** Destructive / loss text. */
    danger: number;
    /** Positive / profit text. */
    success: number;
    /** Cautionary text. */
    warning: number;
  };
  border: {
    /** Standard panel / divider border. */
    default: number;
    /** Stronger border (modal frames, emphasized cards). */
    strong: number;
    /** Subtle border (faint dividers). */
    subtle: number;
    /** Focus ring color. */
    focus: number;
  };
  accent: {
    /** Primary brand accent. */
    primary: number;
    /** Secondary / hover variant of the primary accent. */
    secondary: number;
    /** Positive accent (profit / confirm). */
    success: number;
    /** Warning accent. */
    warning: number;
    /** Destructive accent (loss / error / cancel). */
    danger: number;
    /** Informational accent. */
    info: number;
  };
}

export interface ThemeConfig {
  /**
   * Semantic color tokens. New code should prefer these over the flat
   * `colors` map below.
   */
  color: SemanticColorTokens;
  /**
   * Legacy flat color palette. Retained for backwards compatibility while
   * components are migrated to `color.*` tokens.
   */
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
  /**
   * Keyboard focus ring drawn around the currently focused widget.
   * Width is the stroke thickness in pixels; offset is the gap between the
   * widget bounds and the ring.
   */
  focusRing: {
    color: number;
    width: number;
    offset: number;
  };
}

const SHARED_TYPOGRAPHY = {
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
  chamfer: { size: 8 },
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
  focusRing: {
    color: 0x33ffdd,
    width: 2,
    offset: 2,
  },
} as const;

// ─── Dark theme (sci-fi default) ─────────────────────────────────────────────
const DARK_LEGACY_COLORS = {
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
  rowHover: 0x252560,
  modalOverlay: 0x000000,
} as const;

const DARK_SEMANTIC_COLORS: SemanticColorTokens = {
  surface: {
    default: DARK_LEGACY_COLORS.panelBg,
    raised: DARK_LEGACY_COLORS.headerBg,
    sunken: DARK_LEGACY_COLORS.rowEven,
    hover: DARK_LEGACY_COLORS.rowHover,
    active: DARK_LEGACY_COLORS.buttonPressed,
    disabled: DARK_LEGACY_COLORS.buttonDisabled,
  },
  text: {
    primary: DARK_LEGACY_COLORS.text,
    secondary: 0xc0c0e0,
    muted: DARK_LEGACY_COLORS.textDim,
    inverse: 0x0a0a1a,
    link: DARK_LEGACY_COLORS.accent,
    danger: DARK_LEGACY_COLORS.loss,
    success: DARK_LEGACY_COLORS.profit,
    warning: DARK_LEGACY_COLORS.warning,
  },
  border: {
    default: DARK_LEGACY_COLORS.panelBorder,
    strong: 0x4a4a8a,
    subtle: 0x1f1f3f,
    focus: DARK_LEGACY_COLORS.accent,
  },
  accent: {
    primary: DARK_LEGACY_COLORS.accent,
    secondary: DARK_LEGACY_COLORS.accentHover,
    success: DARK_LEGACY_COLORS.profit,
    warning: DARK_LEGACY_COLORS.warning,
    danger: DARK_LEGACY_COLORS.loss,
    info: 0x66aaff,
  },
};

export const darkTheme: ThemeConfig = {
  color: DARK_SEMANTIC_COLORS,
  colors: { ...DARK_LEGACY_COLORS },
  ...SHARED_TYPOGRAPHY,
};

// ─── Light theme ─────────────────────────────────────────────────────────────
const LIGHT_LEGACY_COLORS = {
  background: 0xf2f4fa,
  panelBg: 0xffffff,
  panelBorder: 0xc0c8d8,
  text: 0x1a1a2e,
  textDim: 0x66708a,
  accent: 0x0066cc,
  accentHover: 0x0080ff,
  profit: 0x008844,
  loss: 0xcc2233,
  warning: 0xcc8800,
  buttonBg: 0xe8ecf4,
  buttonHover: 0xd8def0,
  buttonPressed: 0xc0c8e0,
  buttonDisabled: 0xeef0f5,
  scrollbarTrack: 0xe0e4ec,
  scrollbarThumb: 0xb0b8cc,
  headerBg: 0xe8ecf4,
  rowEven: 0xffffff,
  rowOdd: 0xf4f6fb,
  rowHover: 0xdce4f5,
  modalOverlay: 0x000000,
} as const;

const LIGHT_SEMANTIC_COLORS: SemanticColorTokens = {
  surface: {
    default: LIGHT_LEGACY_COLORS.panelBg,
    raised: LIGHT_LEGACY_COLORS.headerBg,
    sunken: LIGHT_LEGACY_COLORS.rowEven,
    hover: LIGHT_LEGACY_COLORS.rowHover,
    active: LIGHT_LEGACY_COLORS.buttonPressed,
    disabled: LIGHT_LEGACY_COLORS.buttonDisabled,
  },
  text: {
    primary: LIGHT_LEGACY_COLORS.text,
    secondary: 0x3a4258,
    muted: LIGHT_LEGACY_COLORS.textDim,
    inverse: 0xffffff,
    link: LIGHT_LEGACY_COLORS.accent,
    danger: LIGHT_LEGACY_COLORS.loss,
    success: LIGHT_LEGACY_COLORS.profit,
    warning: LIGHT_LEGACY_COLORS.warning,
  },
  border: {
    default: LIGHT_LEGACY_COLORS.panelBorder,
    strong: 0x8090a8,
    subtle: 0xe0e4ec,
    focus: LIGHT_LEGACY_COLORS.accent,
  },
  accent: {
    primary: LIGHT_LEGACY_COLORS.accent,
    secondary: LIGHT_LEGACY_COLORS.accentHover,
    success: LIGHT_LEGACY_COLORS.profit,
    warning: LIGHT_LEGACY_COLORS.warning,
    danger: LIGHT_LEGACY_COLORS.loss,
    info: 0x3388dd,
  },
};

export const lightTheme: ThemeConfig = {
  color: LIGHT_SEMANTIC_COLORS,
  colors: { ...LIGHT_LEGACY_COLORS },
  ...SHARED_TYPOGRAPHY,
};

// ─── High-contrast theme ─────────────────────────────────────────────────────
const HC_LEGACY_COLORS = {
  background: 0x000000,
  panelBg: 0x000000,
  panelBorder: 0xffffff,
  text: 0xffffff,
  textDim: 0xcccccc,
  accent: 0xffff00,
  accentHover: 0xffffaa,
  profit: 0x00ff00,
  loss: 0xff4444,
  warning: 0xffaa00,
  buttonBg: 0x000000,
  buttonHover: 0x222222,
  buttonPressed: 0x444444,
  buttonDisabled: 0x111111,
  scrollbarTrack: 0x222222,
  scrollbarThumb: 0xffffff,
  headerBg: 0x111111,
  rowEven: 0x000000,
  rowOdd: 0x111111,
  rowHover: 0x333300,
  modalOverlay: 0x000000,
} as const;

const HC_SEMANTIC_COLORS: SemanticColorTokens = {
  surface: {
    default: HC_LEGACY_COLORS.panelBg,
    raised: HC_LEGACY_COLORS.headerBg,
    sunken: HC_LEGACY_COLORS.rowEven,
    hover: HC_LEGACY_COLORS.rowHover,
    active: HC_LEGACY_COLORS.buttonPressed,
    disabled: HC_LEGACY_COLORS.buttonDisabled,
  },
  text: {
    primary: HC_LEGACY_COLORS.text,
    secondary: 0xffffff,
    muted: HC_LEGACY_COLORS.textDim,
    inverse: 0x000000,
    link: HC_LEGACY_COLORS.accent,
    danger: HC_LEGACY_COLORS.loss,
    success: HC_LEGACY_COLORS.profit,
    warning: HC_LEGACY_COLORS.warning,
  },
  border: {
    default: HC_LEGACY_COLORS.panelBorder,
    strong: 0xffffff,
    subtle: 0xaaaaaa,
    focus: HC_LEGACY_COLORS.accent,
  },
  accent: {
    primary: HC_LEGACY_COLORS.accent,
    secondary: HC_LEGACY_COLORS.accentHover,
    success: HC_LEGACY_COLORS.profit,
    warning: HC_LEGACY_COLORS.warning,
    danger: HC_LEGACY_COLORS.loss,
    info: 0x66ddff,
  },
};

export const highContrastTheme: ThemeConfig = {
  color: HC_SEMANTIC_COLORS,
  colors: { ...HC_LEGACY_COLORS },
  ...SHARED_TYPOGRAPHY,
};

/**
 * The default theme. Aliased to `darkTheme` because the existing sci-fi
 * palette is a dark theme — keeping this as the default preserves visual
 * parity for callers that don't switch themes.
 */
export const DEFAULT_THEME: ThemeConfig = darkTheme;

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
