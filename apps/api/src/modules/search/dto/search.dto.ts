import { z } from "zod";

export const SEARCH_TYPES = ["report", "note", "project", "asset"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const searchQuerySchema = z.object({
  q: z.string().min(1, "q is required").max(200),
  types: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter((s): s is SearchType =>
              (SEARCH_TYPES as readonly string[]).includes(s),
            )
        : [...SEARCH_TYPES],
    ),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchHit {
  id: string;
  type: SearchType;
  title: string;
  snippet: string;
  score: number;
  projectName?: string;
}
