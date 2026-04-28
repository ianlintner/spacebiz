import { DEFAULT_THEME } from "@spacebiz/ui";
import type { ThemeConfig } from "@spacebiz/ui";

/**
 * Theme variants used by the styleguide's theme switcher.
 *
 * The semantic-token themes are still being defined in a parallel work unit;
 * until they land in `@spacebiz/ui`, the styleguide ships its own minimal
 * variants so the theme-switcher UX can be exercised in this PR.
 */

export const darkTheme: ThemeConfig = DEFAULT_THEME;

export const lightTheme: ThemeConfig = {
  ...DEFAULT_THEME,
  colors: {
    ...DEFAULT_THEME.colors,
    background: 0xf2f2f7,
    panelBg: 0xffffff,
    panelBorder: 0xb8b8c8,
    text: 0x16162a,
    textDim: 0x55556a,
    accent: 0x0066cc,
    accentHover: 0x3388dd,
    headerBg: 0xe8e8f0,
    buttonBg: 0xe2e2ec,
    buttonHover: 0xd0d0dc,
    buttonPressed: 0xb8b8c8,
    buttonDisabled: 0xeaeaf0,
    rowEven: 0xffffff,
    rowOdd: 0xf3f3f8,
    rowHover: 0xdfe6f5,
    modalOverlay: 0x000000,
  },
  glass: {
    ...DEFAULT_THEME.glass,
    bgAlpha: 0.95,
    topTint: 0xffffff,
    bottomTint: 0xe8e8f0,
    innerBorderAlpha: 0.4,
  },
};

export const highContrastTheme: ThemeConfig = {
  ...DEFAULT_THEME,
  colors: {
    ...DEFAULT_THEME.colors,
    background: 0x000000,
    panelBg: 0x000000,
    panelBorder: 0xffffff,
    text: 0xffffff,
    textDim: 0xcccccc,
    accent: 0xffff00,
    accentHover: 0xffff66,
    profit: 0x00ff00,
    loss: 0xff3333,
    warning: 0xffaa00,
    headerBg: 0x000000,
    buttonBg: 0x000000,
    buttonHover: 0x222222,
    buttonPressed: 0xffff00,
    buttonDisabled: 0x111111,
  },
  glass: {
    ...DEFAULT_THEME.glass,
    bgAlpha: 1,
    topTint: 0x000000,
    bottomTint: 0x000000,
    innerBorderAlpha: 0,
  },
  panel: {
    ...DEFAULT_THEME.panel,
    borderWidth: 3,
  },
};
