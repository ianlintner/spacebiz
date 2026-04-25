/**
 * Local ESLint plugin "sft" for Star Freight Tycoon custom rules.
 *
 * Referenced from the root `eslint.config.js` via
 *   `plugins: { sft: localPlugin }`.
 */
import { rule as requireWidgetTestId } from "./require-widget-testid.ts";

export const rules = {
  "require-widget-testid": requireWidgetTestId,
};

const plugin = {
  meta: {
    name: "sft",
    version: "0.1.0",
  },
  rules,
};

export default plugin;
