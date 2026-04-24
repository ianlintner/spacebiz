#!/usr/bin/env node
// Smoke-test the MCP server: send `initialize` + `tools/list` over stdio and
// assert the tool list contains the expected names. Does NOT require the dev
// server — we never call a tool, just enumerate them.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, "../dist/index.js");

const REQUIRED_TOOLS = [
  "sft_click",
  "sft_snapshot",
  "sft_list",
  "sft_actions_newGame",
  "sft_actions_endTurn",
  "sft_seed",
  "sft_log_tail",
];

const child = spawn(process.execPath, [entry], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env },
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

function send(obj) {
  child.stdin.write(JSON.stringify(obj) + "\n");
}

function readMessage(id, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const lines = stdout.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) return resolve(msg);
        } catch {
          /* partial */
        }
      }
      if (Date.now() > deadline) {
        return reject(new Error(`timeout waiting for id=${id}. stderr=${stderr}`));
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

try {
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke", version: "0.0.0" },
    },
  });
  await readMessage(1);

  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const listResp = await readMessage(2);
  const tools = listResp.result?.tools ?? [];
  const names = tools.map((t) => t.name);

  const missing = REQUIRED_TOOLS.filter((n) => !names.includes(n));
  if (tools.length === 0) throw new Error("tools/list returned empty array");
  if (missing.length > 0) {
    throw new Error(`missing required tools: ${missing.join(", ")}; got=${names.join(", ")}`);
  }

  console.log(`OK: ${tools.length} tools registered.`);
  console.log(names.sort().join("\n"));
  child.kill("SIGTERM");
  process.exit(0);
} catch (err) {
  console.error(`SMOKE FAILED: ${err.message}`);
  console.error("stderr:", stderr);
  child.kill("SIGTERM");
  process.exit(1);
}
