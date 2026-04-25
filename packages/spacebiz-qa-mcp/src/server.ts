import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools.js";
import { closeBrowser } from "./browser.js";

const SERVER_NAME = "spacebiz-qa-mcp";
const SERVER_VERSION = "0.1.0";

/** Create the configured MCP server (no transport attached). */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        "Drive the Star Freight Tycoon dev build via the `window.__sft` QA façade. " +
        "Start with `sft_list` to discover widgets, then `sft_click` to fire onClick handlers. " +
        "Use `sft_actions_newGame` to bootstrap a seeded run and `sft_snapshot` to inspect state. " +
        "The dev server (vite) must already be running at http://localhost:5173 (or SFT_URL).",
    },
  );
  registerAllTools(server);
  return server;
}

/** Connect the server to stdio and keep it running until the process exits. */
export async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async (): Promise<void> => {
    try {
      await server.close();
    } catch {
      // best-effort
    }
    await closeBrowser();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}
