import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { driver, run } from "./util.js";

export function registerDiscoveryTools(server: McpServer): void {
  server.registerTool(
    "sft_version",
    {
      title: "QA API version",
      description: "Return the semver version of the `window.__sft` contract.",
      inputSchema: {},
    },
    async () =>
      run(async () => ({ version: await (await driver()).version() })),
  );

  server.registerTool(
    "sft_list",
    {
      title: "List widgets",
      description:
        "List registered widgets (testId, label, kind, scene, enabled, visible) in currently active scenes. Optional substring filter on testId or label.",
      inputSchema: {
        filter: z
          .string()
          .optional()
          .describe(
            "Case-insensitive substring to match against testId or label.",
          ),
      },
    },
    async ({ filter }) => run(async () => (await driver()).list(filter)),
  );

  server.registerTool(
    "sft_currentScene",
    {
      title: "Current scene",
      description: "Return the active scene keys and modal stack.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).currentScene()),
  );

  server.registerTool(
    "sft_snapshot",
    {
      title: "Game state snapshot",
      description:
        "Return a JSON-safe snapshot: version, timestamp, scene info, seed, turn, and full GameState.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).snapshot()),
  );

  server.registerTool(
    "sft_state",
    {
      title: "Game state",
      description:
        "Return just the `state` portion of the snapshot — the deep-cloned GameState.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).state()),
  );

  server.registerTool(
    "sft_help",
    {
      title: "QA façade help",
      description:
        "Invoke `__sft.help()` in the page, which prints a categorized command list to the browser console. Returns the help payload if the façade exposes one.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).help()),
  );
}
