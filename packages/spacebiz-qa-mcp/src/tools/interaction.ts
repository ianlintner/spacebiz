import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { driver, run } from "./util.js";

export function registerInteractionTools(server: McpServer): void {
  server.registerTool(
    "sft_click",
    {
      title: "Click a widget",
      description:
        "Fire the onClick handler that a real pointer click would trigger. Throws SftTestError with code `unknown-test-id`, `widget-disabled`, or `widget-not-visible` on failure.",
      inputSchema: {
        testId: z.string().describe("The widget's testId (see `sft_list`)."),
      },
    },
    async ({ testId }) => run(async () => (await driver()).click(testId)),
  );

  server.registerTool(
    "sft_clickIfPresent",
    {
      title: "Click if present",
      description:
        "Like `sft_click`, but returns `null` instead of throwing when the testId is not registered.",
      inputSchema: {
        testId: z.string().describe("The widget's testId (see `sft_list`)."),
      },
    },
    async ({ testId }) =>
      run(async () => (await driver()).clickIfPresent(testId)),
  );
}
