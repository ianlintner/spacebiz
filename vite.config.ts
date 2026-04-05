import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  base: "./",
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
  },
  test: {
    globals: true,
    environment: "node",
  },
});
