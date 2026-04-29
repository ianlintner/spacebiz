import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDiscoveryTools } from "./tools/discovery.js";
import { registerInteractionTools } from "./tools/interaction.js";
import { registerActionTools } from "./tools/actions.js";
import { registerObservabilityTools } from "./tools/observability.js";
import { registerDeterminismTools } from "./tools/determinism.js";
import { registerTier2Tools } from "./tools/tier2.js";

/** Register every MCP tool on the given server instance. */
export function registerAllTools(server: McpServer): void {
  registerDiscoveryTools(server);
  registerInteractionTools(server);
  registerActionTools(server);
  registerObservabilityTools(server);
  registerDeterminismTools(server);
  registerTier2Tools(server);
}
