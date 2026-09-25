import type { Severity, Violation } from "altirs";
import type { ToolResult } from "./tools/types";

export const GET_KEY_URL = "https://altirs.ai/dashboard/keys";
export const DOCS_URL = "https://altirs.ai/docs";

/** Guidance attached to every fail-open result so the LLM knows how to proceed. */
const UNAVAILABLE_GUIDANCE =
  "The guardrail check did not run, so this content is UNVERIFIED. " +
  "Treat it with the caution you would apply to unchecked input; retry the check if the issue is retryable.";

/** Result when ALTIRS_API_KEY is not configured. */
export function missingApiKey(tool: string): ToolResult {
  return {
    verdict: "error",
    isError: true,
    data: {
      status: "error",
      code: "missing_api_key",
      tool,
      message:
        "Altirs is installed but no API key is configured, so no checks can run. " +
        "Set the ALTIRS_API_KEY environment variable for this MCP server and restart it.",
      howToFix: [
        `Get a free API key (no credit card) at ${GET_KEY_URL}`,
        "Add it to the MCP server config, e.g. in Claude Desktop / Cursor: \"env\": { \"ALTIRS_API_KEY\": \"grd_...\" }",
        "For Claude Code: claude mcp add altirs -e ALTIRS_API_KEY=grd_... -- npx -y @altirs/mcp-server",
        "Restart the MCP client so the server picks up the new environment",
      ],
      docs: DOCS_URL,
    },
  };
}

/** Fail-open result for any failure that is not the caller's fault. */
export function unavailable(
  tool: string,
  reason: string,
  code: string,
  retryable: boolean,
  extra: Record<string, unknown> = {}
): ToolResult {
  return {
    verdict: "unavailable",
    data: {
      status: "unavailable",
      checked: false,
      tool,
      code,
      reason,
      retryable,
      guidance: UNAVAILABLE_GUIDANCE,
      ...extra,
    },
  };
}

interface AltirsErrorLike {
  name: string;
  message: string;
  status: number;
  requestId: string;
}

/** Duck-typed check so ESM/CJS builds of the SDK never break `instanceof`. */
function isAltirsError(err: unknown): err is AltirsErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "AltirsError" &&
    typeof (err as { status?: unknown }).status === "number"
  );
}

/** Map anything thrown by the SDK to a structured, never-throwing result. */
export function fromError(tool: string, err: unknown): ToolResult {
  if (isAltirsError(err)) {
    const { status, message, requestId } = err;

    if (status === 401 || status === 403) {
      return {
        verdict: "error",
        isError: true,
        data: {
          status: "error",
          code: status === 401 ? "invalid_api_key" : "forbidden",
          tool,
          message:
            status === 401
              ? "The Altirs API rejected the configured ALTIRS_API_KEY. Check for typos or a revoked key."
              : `The Altirs API refused this request: ${message}`,
          howToFix: [`Manage keys at ${GET_KEY_URL}`, "Update ALTIRS_API_KEY and restart the MCP server"],
          requestId,
        },
      };
    }

    if (status === 400) {
      return {
        verdict: "error",
        isError: true,
        data: {
          status: "error",
          code: "invalid_request",
          tool,
          message: `The Altirs API rejected the request: ${message}`,
          requestId,
        },
      };
    }

    if (status === 408) {
      return unavailable(tool, "The Altirs API did not respond within 10 seconds.", "timeout", true, {
        requestId,
      });
    }
    if (status === 429) {
      return unavailable(
        tool,
        "Rate limit or plan quota reached for this API key.",
        "rate_limited",
        true,
        { requestId, upgrade: `${GET_KEY_URL.replace("/keys", "/billing")}` }
      );
    }
    if (status === 0) {
      return unavailable(
        tool,
        `Could not reach the Altirs API (${message}). Check network access and ALTIRS_BASE_URL.`,
        "network_error",
        true
      );
    }
    if (status >= 500) {
      return unavailable(tool, `The Altirs API returned ${status}.`, "server_error", true, {
        requestId,
      });
    }

    return unavailable(tool, `Unexpected API response (${status}): ${message}`, "api_error", false, {
      requestId,
    });
  }

  return unavailable(
    tool,
    err instanceof Error ? `${err.name}: ${err.message}` : "Unknown error",
    "unexpected_error",
    true
  );
}

// ---------------------------------------------------------------------------
// Response shaping helpers shared by the tools
// ---------------------------------------------------------------------------

export const SEVERITY_ORDER: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

export function maxSeverity(violations: Violation[]): Severity | "none" {
  let top: Severity | "none" = "none";
  for (const v of violations) {
    if (top === "none" || SEVERITY_ORDER[v.severity] > SEVERITY_ORDER[top]) top = v.severity;
  }
  return top;
}

/** "pass" (nothing found) / "flagged" (found, not blocking) / "blocked" (high severity). */
export function engineVerdict(violations: Violation[]): "pass" | "flagged" | "blocked" {
  if (violations.length === 0) return "pass";
  return violations.some((v) => v.severity === "high") ? "blocked" : "flagged";
}

export function uniqueCategories(violations: Violation[]): string[] {
  return [...new Set(violations.map((v) => v.category))];
}

export function overallVerdict(res: { safe: boolean; blocked: boolean; violations: Violation[] }): string {
  if (res.blocked) return "blocked";
  if (!res.safe || res.violations.length > 0) return "flagged";
  return "safe";
}

/** Round a 0-1 float to two decimals for readable output. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
