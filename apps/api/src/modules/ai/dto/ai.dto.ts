import { z } from "zod";
import { AI_ACTIONS } from "../prompts";

export const aiProviderSchema = z.enum([
  "anthropic",
  "openai",
  "openai-compatible",
  "ollama",
]);
export type AiProviderName = z.infer<typeof aiProviderSchema>;

export const saveSettingsSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
  maxTokens: z.coerce.number().int().min(1).max(200_000).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  monthlyTokenBudget: z.coerce.number().int().min(0).optional(),
});
export type SaveSettingsInput = z.infer<typeof saveSettingsSchema>;

export const testSettingsSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
});
export type TestSettingsInput = z.infer<typeof testSettingsSchema>;

export const completeSchema = z.object({
  action: z.enum(AI_ACTIONS),
  content: z.string().default(""),
  selection: z.string().optional(),
  context: z
    .object({ noteId: z.string().optional(), reportId: z.string().optional() })
    .optional(),
  instruction: z.string().optional(),
});
export type CompleteInput = z.infer<typeof completeSchema>;
