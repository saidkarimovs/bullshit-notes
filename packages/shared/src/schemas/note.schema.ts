import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(300),
  bodyMd: z.string().default(""),
  folderId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  frontmatter: z.record(z.unknown()).default({}),
  pinned: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial().extend({
  archivedAt: z.coerce.date().optional().nullable(),
});
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const noteQuerySchema = paginationQuerySchema.extend({
  folderId: z.string().optional(),
  projectId: z.string().optional(),
  pinned: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  tags: z.array(z.string()).optional(),
});
export type NoteQuery = z.infer<typeof noteQuerySchema>;

export const createFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().optional().nullable(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = createFolderSchema.partial();
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

// Graph response shapes
export type NoteGraphNode = {
  id: string;
  title: string;
  tags: string[];
  linkCount: number;
};
export type NoteGraphEdge = {
  source: string;
  target: string | null;
  resolved: boolean;
};
export type NoteGraph = { nodes: NoteGraphNode[]; edges: NoteGraphEdge[] };
