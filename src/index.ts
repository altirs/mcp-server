#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";
import { createDeps, readConfig } from "./client";
import { log } from "./log";
import { SERVER_VERSION } from "./version";

async function main(): Promise<void> {
  const config = readConfig();
  if (!config.apiKey) {
    log.warn({
      event: "config",
      message: "ALTIRS_API_KEY is not set; tools will return a setup error until it is configured.",
    });
  }
  const server = createServer(createDeps());
  const transport = new StdioServerTransport();

  let exiting = false;
  const shutdown = (reason: string, code = 0): void => {
    if (exiting) return;
    exiting = true;
    log.info({ event: "shutdown", reason });
    void server.close().finally(() => process.exit(code));
  };

  // The MCP client owns the enabled/disabled state: when a user disables the
  // server, the client closes our stdin. The stdio transport does not watch for
  // that, so without these hooks a disabled server would linger as an orphan.
  transport.onclose = () => shutdown("transport_closed");
  process.stdin.once("end", () => shutdown("stdin_end"));
  process.stdin.once("close", () => shutdown("stdin_close"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await server.connect(transport);
  log.info({ event: "started", version: SERVER_VERSION, apiKeyConfigured: Boolean(config.apiKey) });
}

main().catch((err: unknown) => {
  log.error({
    event: "fatal",
    error: err instanceof Error ? err.name : "UnknownError",
  });
  process.exit(1);
});
