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
}

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    background: 0x0a0a1a,
    panelBg: 0x111128,
    panelBorder: 0x2a2a5a,
    text: 0xe0e0ff,
    textDim: 0x8080aa,
    accent: 0x00ffcc,
    accentHover: 0x33ffdd,
    profit: 0x00ff88,
    loss: 0xff4444,
    warning: 0xffaa00,
    buttonBg: 0x1a1a40,
    buttonHover: 0x2a2a60,
    buttonPressed: 0x0a0a30,
    buttonDisabled: 0x151530,
    scrollbarTrack: 0x0a0a20,
    scrollbarThumb: 0x3a3a6a,
    headerBg: 0x1a1a3a,
    rowEven: 0x111128,
    rowOdd: 0x151535,
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
