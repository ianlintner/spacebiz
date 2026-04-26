import { defineConfig } from "vite";
import path from "path";
import { execSync } from "node:child_process";

function readGitValue(command: string): string | undefined {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function normalizeGitHubRemote(remote: string | undefined): string | undefined {
  if (!remote) {
    return undefined;
  }

  const sshMatch = /^git@github\.com:(.+?)(?:\.git)?$/.exec(remote);
  if (sshMatch) {
    return `https://github.com/${sshMatch[1]}`;
  }

  if (remote.startsWith("https://github.com/")) {
    return remote.replace(/\.git$/, "");
  }

  return undefined;
}

const commitSha =
  process.env.GITHUB_SHA ?? readGitValue("git rev-parse HEAD") ?? "unknown";
const shortCommit = commitSha === "unknown" ? "unknown" : commitSha.slice(0, 7);
const buildNumber =
  process.env.GITHUB_RUN_NUMBER ?? process.env.BUILD_NUMBER ?? "local";
const repository = process.env.GITHUB_REPOSITORY;
const githubBaseUrl = repository
  ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repository}`
  : normalizeGitHubRemote(readGitValue("git config --get remote.origin.url"));
const commitUrl =
  githubBaseUrl && commitSha !== "unknown"
    ? `${githubBaseUrl}/commit/${commitSha}`
    : githubBaseUrl;

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
  define: {
    __SFT_BUILD_INFO__: JSON.stringify({
      buildNumber,
      commitSha,
      shortCommit,
      githubUrl: commitUrl ?? "",
    }),
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
