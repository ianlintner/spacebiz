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
  },
});
