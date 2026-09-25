import { checkContent } from "./check-content";
import { detectPii } from "./detect-pii";
import { scanInjection } from "./scan-injection";
import { checkSafety } from "./check-safety";
import { checkHallucination } from "./check-hallucination";
import type { AnyToolDefinition } from "./types";

export const tools: AnyToolDefinition[] = [
  checkContent,
  detectPii,
  scanInjection,
  checkSafety,
  checkHallucination,
];

export { checkContent, detectPii, scanInjection, checkSafety, checkHallucination };
export type { ToolDeps, ToolResult, ToolDefinition, AnyToolDefinition } from "./types";
