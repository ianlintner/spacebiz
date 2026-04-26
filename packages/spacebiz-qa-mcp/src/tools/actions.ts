import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { driver, run } from "./util.js";

/**
 * `__sft.actions.*` are high-level scripted helpers. Each is exposed as its
 * own MCP tool (`sft_actions_<name>`) so clients can enumerate the full
 * surface via `tools/list` rather than a single opaque `invokeAction` tool.
 */
export function registerActionTools(server: McpServer): void {
  server.registerTool(
    "sft_actions_newGame",
    {
      title: "Start a new game",
      description:
        "Invoke `__sft.actions.newGame(seed?)` — drives the real UI path to start a campaign, optionally seeded for determinism.",
      inputSchema: {
        seed: z
          .number()
          .int()
          .optional()
          .describe(
            "Optional integer seed for deterministic world generation.",
          ),
      },
    },
    async ({ seed }) =>
      run(async () =>
        seed === undefined
          ? await (await driver()).action("newGame")
          : await (await driver()).action("newGame", seed),
      ),
  );

  server.registerTool(
    "sft_actions_endTurn",
    {
      title: "End the current turn",
      description:
        "Invoke `__sft.actions.endTurn()` — clicks `btn-end-turn` if present, advancing the turn counter.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).action("endTurn")),
  );

  server.registerTool(
    "sft_actions_openScene",
    {
      title: "Open a scene",
      description:
        "Invoke `__sft.actions.openScene(key, data?)` — push a scene onto the Phaser scene stack.",
      inputSchema: {
        key: z.string().describe("Phaser scene key, e.g. `RoutesScene`."),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional init payload passed to the scene."),
      },
    },
    async ({ key, data }) =>
      run(async () =>
        data === undefined
          ? await (await driver()).action("openScene", key)
          : await (await driver()).action("openScene", key, data),
      ),
  );

  server.registerTool(
    "sft_actions_closeModal",
    {
      title: "Close the top modal",
      description:
        "Invoke `__sft.actions.closeModal()` — dismiss the top modal on the stack (no-op if empty).",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).action("closeModal")),
  );
}
