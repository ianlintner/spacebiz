import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { driver, run } from "./util.js";

export function registerObservabilityTools(server: McpServer): void {
  server.registerTool(
    "sft_log_tail",
    {
      title: "Tail recent log entries",
      description:
        "Return the last N entries from the channel-based log ring buffer (`__sft.log.tail(n)`).",
      inputSchema: {
        n: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Number of entries to return (default 50, max 1000)."),
      },
    },
    async ({ n }) => run(async () => (await driver()).logTail(n ?? 50)),
  );

  server.registerTool(
    "sft_log_clear",
    {
      title: "Clear the log buffer",
      description:
        "Invoke `__sft.log.clear()` — empties the in-page log ring buffer.",
      inputSchema: {},
    },
    async () =>
      run(async () => {
        await (await driver()).logClear();
        return { cleared: true };
      }),
  );

  server.registerTool(
    "sft_invariantViolations",
    {
      title: "Recent invariant violations",
      description:
        "Return the last 200 invariant violations recorded by `__sft.invariants.recent()`.",
      inputSchema: {},
    },
    async () => run(async () => (await driver()).invariantViolations()),
  );
}
