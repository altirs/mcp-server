import { z } from "zod";
import { defineTool, ALTIRS_TOOL_ANNOTATIONS } from "./types";
import { fromError, maxSeverity, missingApiKey, round2 } from "../result";

export const checkHallucination = defineTool({
  name: "check_hallucination",
  title: "Check a claim against source context",
  description:
    "Verify whether a claim or generated answer is grounded in a given source text. " +
    "Use this after producing a summary, answer, or extraction from documents, search results, or retrieved context " +
    "to catch fabricated facts before presenting them. " +
    "Pass the generated text as `claim` and the material it should be based on as `context`. " +
    "Returns `grounded` (boolean), a 0-1 `confidence` (1 = fully grounded), `riskLevel`, the specific risky statements " +
    "(overconfident claims, unverified citations, unsourced statistics, contradictions), and a `recommendation`.",
  inputSchema: {
    claim: z
      .string()
      .min(1, "claim must not be empty")
      .describe("The statement, answer, or summary to verify."),
    context: z
      .string()
      .min(1, "context must not be empty")
      .describe("The source material the claim must be supported by (documents, retrieved passages, search results)."),
  },
  annotations: ALTIRS_TOOL_ANNOTATIONS,
  async handler(args, deps) {
    if (!deps.client) return missingApiKey("check_hallucination");

    try {
      // The API models this as input (what the model was given) + response (what it produced).
      const res = await deps.client.check({
        input: args.context,
        response: args.claim,
        checks: ["hallucination"],
        options: { hallucination: { context: args.context } },
      });
      const issues = res.violations.filter((v) => v.type === "hallucination_risk");
      const grounded = issues.length === 0;

      return {
        verdict: grounded ? "grounded" : "ungrounded",
        data: {
          status: "ok",
          grounded,
          confidence: round2(res.score),
          riskLevel: maxSeverity(issues),
          issues: issues.map((v) => ({
            category: v.category,
            severity: v.severity,
            description: v.description,
          })),
          recommendation:
            res.recommendation ?? (grounded ? "No hallucination risk detected; safe to present." : null),
          requestId: res.requestId,
        },
      };
    } catch (err) {
      return fromError("check_hallucination", err);
    }
  },
});
