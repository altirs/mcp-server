import type { ZodRawShape, z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { CheckPayload, CheckResponse } from "altirs";

/**
 * The slice of the Altirs SDK client the tools depend on. Narrow on purpose so
 * tests can supply a plain object instead of a real `Altirs` instance.
 */
export interface GuardrailClient {
  check(payload: CheckPayload): Promise<CheckResponse>;
}

/**
 * Dependencies injected into every tool handler.
 * `client` is null when no API key is configured — tools then return the
 * missing-key error instead of attempting a request.
 */
export interface ToolDeps {
  client: GuardrailClient | null;
}

/** What a tool handler returns; the server serialises it onto the wire. */
export interface ToolResult {
  /** Structured, LLM-readable payload (serialised as JSON text). */
  data: Record<string, unknown>;
  /** Short verdict for metadata logging, e.g. "safe" / "blocked" / "unavailable". */
  verdict: string;
  /** Mark the result as an error for the client (missing key, bad input, ...). */
  isError?: boolean;
}

export interface ToolDefinition<Shape extends ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  annotations: ToolAnnotations;
  handler: (
    args: z.objectOutputType<Shape, z.ZodTypeAny>,
    deps: ToolDeps
  ) => Promise<ToolResult>;
}

/**
 * Erased form used where tools of different shapes are handled together
 * (the registry array and server registration). Individual tool files stay
 * fully typed through `defineTool`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolDefinition = ToolDefinition<any>;

/** Identity helper so each tool file gets full type inference on `args`. */
export function defineTool<Shape extends ZodRawShape>(
  def: ToolDefinition<Shape>
): ToolDefinition<Shape> {
  return def;
}

/** Shared annotations: every Altirs tool is a read-only call to an external API. */
export const ALTIRS_TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
