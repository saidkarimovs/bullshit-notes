import { SUMMARIZE_PROMPT } from "./summarize.prompt";
import { IMPROVE_PROMPT } from "./improve.prompt";
import { EXPAND_PROMPT } from "./expand.prompt";
import { FIX_GRAMMAR_PROMPT } from "./fix-grammar.prompt";
import { TO_REPORT_PROMPT } from "./to-report.prompt";
import { EXPLAIN_CVE_PROMPT } from "./explain-cve.prompt";
import { SUGGEST_TAGS_PROMPT } from "./suggest-tags.prompt";
import { CUSTOM_PROMPT } from "./custom.prompt";

export const AI_ACTIONS = [
  "summarize",
  "improve",
  "expand",
  "fix-grammar",
  "to-report",
  "explain-cve",
  "suggest-tags",
  "custom",
] as const;

export type AiAction = (typeof AI_ACTIONS)[number];

export const SYSTEM_PROMPTS: Record<AiAction, string> = {
  summarize: SUMMARIZE_PROMPT,
  improve: IMPROVE_PROMPT,
  expand: EXPAND_PROMPT,
  "fix-grammar": FIX_GRAMMAR_PROMPT,
  "to-report": TO_REPORT_PROMPT,
  "explain-cve": EXPLAIN_CVE_PROMPT,
  "suggest-tags": SUGGEST_TAGS_PROMPT,
  custom: CUSTOM_PROMPT,
};
