import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { driver, run } from "./util.js";

/**
 * Tier-2 inspection tools — wrap the IP-bearing rogue-universe-shared
 * subsystems (CEO portraits, galactic news ticker, adviser panel) so MCP
 * clients can verify those features render without scraping the canvas.
 */
export function registerTier2Tools(server: McpServer): void {
  server.registerTool(
    "sft_getPortrait",
    {
      title: "Portrait load status",
      description:
        "Return whether a CEO portrait texture is loaded into Phaser's TextureManager. Defaults to the player's CEO when ceoId is omitted.",
      inputSchema: {
        ceoId: z
          .string()
          .optional()
          .describe(
            "CEO portrait id (matches CEO_PORTRAITS[].id). Omit for player.",
          ),
      },
    },
    async ({ ceoId }) => run(async () => (await driver()).getPortrait(ceoId)),
  );

  server.registerTool(
    "sft_getNewsItems",
    {
      title: "Galactic news ticker items",
      description:
        "Return the items the GalacticNewsPanel / HorizontalNewsTicker would currently render. Empty array before the first turn completes.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).getNewsItems()),
  );

  server.registerTool(
    "sft_getAdviserState",
    {
      title: "Adviser subsystem snapshot",
      description:
        "Return adviser state plus the currently-displayed message — useful for asserting AdviserPanel mood/dialogue in e2e specs.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).getAdviserState()),
  );
}
