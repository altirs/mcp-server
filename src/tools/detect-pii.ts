import { z } from "zod";
import { defineTool, ALTIRS_TOOL_ANNOTATIONS } from "./types";
import { fromError, maxSeverity, missingApiKey } from "../result";

export const detectPii = defineTool({
  name: "detect_pii",
  title: "Detect and mask personal data (PII)",
  description:
    "Find personally identifiable information in text — emails, phone numbers, government IDs, IBANs/card numbers, addresses, names — " +
    "and optionally return a masked copy with each entity redacted. " +
    "Use this before logging, storing, sending text to a third party, or including user-supplied content in a response. " +
    "Returns `found` (boolean), the list of PII entities (type, severity, description) and, when `mask` is true, `maskedText` that is safe to pass on. " +
    "Prefer the masked text over the original whenever PII is present.",
  inputSchema: {
    text: z
      .string()
      .min(1, "text must not be empty")
      .describe("The text to scan for personal data."),
    mask: z
      .boolean()
      .default(true)
      .describe("When true (default), also return `maskedText` with every detected entity redacted."),
  },
  annotations: ALTIRS_TOOL_ANNOTATIONS,
  async handler(args, deps) {
    if (!deps.client) return missingApiKey("detect_pii");

    try {
      const res = await deps.client.check({
        input: args.text,
        checks: ["pii"],
        options: { pii: { mask: args.mask } },
      });

      const entities = res.violations
        .filter((v) => v.type === "pii")
        .map((v) => ({ type: v.category, severity: v.severity, description: v.description }));
      const found = entities.length > 0;

      return {
        verdict: found ? "flagged" : "safe",
        data: {
          status: "ok",
          found,
          count: entities.length,
          highestSeverity: maxSeverity(res.violations),
          entities,
          // When nothing was found the API omits maskedInput; the original is already clean.
          ...(args.mask ? { maskedText: res.maskedInput ?? args.text } : {}),
          requestId: res.requestId,
        },
      };
    } catch (err) {
      return fromError("detect_pii", err);
    }
  },
});
