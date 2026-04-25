import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  // "/" = absolute paths; required for Azure Static Web Apps custom domain.
  // Local dev and GitHub Pages previously used "./" (relative) but SWA at
  // the domain root needs absolute so asset paths resolve correctly.
  base: "/",
  resolve: {
    alias: {
      "@spacebiz/ui": path.resolve(
        __dirname,
        "packages/spacebiz-ui/src/index.ts",
      ),
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        styleguide: path.resolve(__dirname, "styleguide/index.html"),
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    exclude: [
      "node_modules",
      "dist",
      "e2e",
      "playwright-report",
      "test-results",
      ".claude/worktrees/**",
    ],
  },
});
