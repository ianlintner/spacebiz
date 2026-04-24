/**
 * ESLint flat config for Star Freight Tycoon.
 *
 * Scope: custom lint rules only (no stylistic / recommended preset noise).
 * Custom rules are wired in via the local `sft` plugin in
 * `tools/eslint-rules/`.
 */
import tsParser from "@typescript-eslint/parser";
import sftPlugin from "./tools/eslint-rules/index.ts";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "e2e/**",
      "scripts/**",
      "packages/*/dist/**",
      "public/**",
      "coverage/**",
      ".claude/**",
      ".hive/**",
      ".playwright-mcp/**",
    ],
  },
  {
    files: ["src/**/*.ts", "packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      sft: sftPlugin,
    },
    rules: {
      // Bootstrap as warn so the rule can land alongside existing
      // violations; promote to "error" once call sites are backfilled
      // with explicit testIds (see PR description).
      "sft/require-widget-testid": "warn",
    },
  },
];
