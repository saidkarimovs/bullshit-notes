import { z } from "zod";

export const startSessionSchema = z.object({
  projectId: z.string().optional(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const sessionsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;

export const leaderboardQuerySchema = z.object({
  by: z.enum(["earnings", "count"]).default("earnings"),
  bucket: z.enum(["day", "week", "month"]).default("month"),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
