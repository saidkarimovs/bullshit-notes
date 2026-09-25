import { z } from "zod";

export const checklistQuerySchema = z.object({
  projectId: z.string().optional(),
});
export type ChecklistQuery = z.infer<typeof checklistQuerySchema>;

export const createChecklistSchema = z.object({
  templateId: z.string().optional(),
  projectId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
});
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

export const updateItemSchema = z.object({
  state: z.enum(["todo", "pass", "fail", "na"]),
  noteId: z.string().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const checklistItemSchema = z.object({
  id: z.string(),
  section: z.string(),
  title: z.string(),
  description: z.string().default(""),
  state: z.enum(["todo", "pass", "fail", "na"]).default("todo"),
  noteId: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  framework: z.string().min(1).max(100),
  description: z.string().max(2000).default(""),
  items: z.array(checklistItemSchema).min(1),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
