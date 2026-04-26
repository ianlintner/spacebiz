#!/usr/bin/env node
import { runStdio } from "./server.js";

runStdio().catch((err: unknown) => {
  // stdio transport owns stdout; emit fatals on stderr so clients see them
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`[sft-qa-mcp] fatal: ${msg}\n`);
  process.exit(1);
});
