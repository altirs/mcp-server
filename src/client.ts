import { Altirs } from "altirs";
import type { ToolDeps } from "./tools/types";
import { SERVER_VERSION } from "./version";
import { readEnv } from "./env";

/**
 * Default API base. The SDK appends `/v1/guardrail/...`, and the Altirs app
 * serves its routes under `/api`, so the base must include that prefix.
 * Override with ALTIRS_BASE_URL for staging or self-hosting.
 */
export const DEFAULT_BASE_URL = "https://altirs.ai/api";

/** Hard ceiling per API call; the SDK aborts the request when it elapses. */
export const REQUEST_TIMEOUT_MS = 10_000;

export interface ServerConfig {
  apiKey: string | null;
  baseUrl: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const apiKey = readEnv(env, "ALTIRS_API_KEY")?.trim() || null;
  const baseUrl = readEnv(env, "ALTIRS_BASE_URL")?.trim() || DEFAULT_BASE_URL;
  return { apiKey, baseUrl };
}

/**
 * Build the tool dependencies from the environment. Never throws: a missing
 * key yields `client: null`, and each tool turns that into an actionable
 * error at call time so the server still starts and lists its tools.
 */
export function createDeps(env: NodeJS.ProcessEnv = process.env): ToolDeps {
  const { apiKey, baseUrl } = readConfig(env);
  if (!apiKey) return { client: null };

  const client = new Altirs({
    apiKey,
    baseUrl,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { "X-SDK-Version": `mcp/${SERVER_VERSION}` },
  });
  return { client };
}
