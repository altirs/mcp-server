import { z } from "zod";
import { defineTool, ALTIRS_TOOL_ANNOTATIONS } from "./types";
import { fromError, maxSeverity, missingApiKey, overallVerdict, round2 } from "../result";

export const checkSafety = defineTool({
  name: "check_safety",
  title: "Classify content safety",
  description:
    "Classify text for harmful or unsafe content — violence, hate, harassment, self-harm, sexual content, illegal activity, and similar categories. " +
    "Use this to moderate user-generated content or to screen an AI response before it is shown to a user. " +
    "Returns the safety categories that were triggered, each with a severity (high / medium / low), " +
    "plus an overall `safe` boolean, `blocked`, and a 0-1 score (1 = clean). " +
    "High-severity categories mean the content should not be displayed or acted on.",
  inputSchema: {
    text: z
      .string()
      .min(1, "text must not be empty")
      .describe("The text to classify."),
  },
  annotations: ALTIRS_TOOL_ANNOTATIONS,
  async handler(args, deps) {
    if (!deps.client) return missingApiKey("check_safety");

    try {
      const res = await deps.client.check({ input: args.text, checks: ["content_safety"] });
      const hits = res.violations.filter((v) => v.type === "content_safety");

      return {
        verdict: overallVerdict(res),
        data: {
          status: "ok",
          safe: res.safe,
          blocked: res.blocked,
          score: round2(res.score),
          highestSeverity: maxSeverity(hits),
          categories: hits.map((v) => ({
            category: v.category,
            severity: v.severity,
            description: v.description,
          })),
          requestId: res.requestId,
        },
      };
    } catch (err) {
      return fromError("check_safety", err);
    }
  },
});
