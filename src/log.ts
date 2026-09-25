import { readEnv } from "./env";
/**
 * Metadata-only logger. Writes one JSON line per event to stderr — stdout is
 * reserved for the MCP wire protocol and must never receive log output.
 *
 * Never pass user text (inputs, claims, context, masked output) to this
 * logger. Only tool names, timings, verdicts, and error classes.
 *
 * Disable entirely with ALTIRS_MCP_LOG=off (also accepts "0" / "false").
 */

export interface LogFields {
  event: string;
  tool?: string;
  latencyMs?: number;
  verdict?: string;
  error?: string;
  [key: string]: string | number | boolean | undefined;
}

const DISABLED_VALUES = new Set(["off", "0", "false", "no"]);

export function isLoggingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = readEnv(env, "ALTIRS_MCP_LOG")?.trim().toLowerCase();
  return !(raw && DISABLED_VALUES.has(raw));
}

function write(level: "info" | "warn" | "error", fields: LogFields): void {
  if (!isLoggingEnabled()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...fields });
  process.stderr.write(line + "\n");
}

export const log = {
  info: (fields: LogFields) => write("info", fields),
  warn: (fields: LogFields) => write("warn", fields),
  error: (fields: LogFields) => write("error", fields),
};
