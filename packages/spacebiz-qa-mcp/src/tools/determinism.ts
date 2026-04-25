import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { driver, run } from "./util.js";

export function registerDeterminismTools(server: McpServer): void {
  server.registerTool(
    "sft_seed",
    {
      title: "Seed the RNG",
      description:
        "Set the GameStore seed for deterministic runs (`__sft.seed(n)`). Apply before actions that sample RNG.",
      inputSchema: {
        seed: z.number().int().describe("Integer seed."),
      },
    },
    async ({ seed }) =>
      run(async () => {
        await (await driver()).seed(seed);
        return { seed };
      }),
  );

  server.registerTool(
    "sft_getSeed",
    {
      title: "Read the RNG seed",
      description: "Return the current GameStore seed (`__sft.getSeed()`).",
      inputSchema: {},
    },
    async () => run(async () => ({ seed: await (await driver()).getSeed() })),
  );
}
