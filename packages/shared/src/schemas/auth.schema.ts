import { z } from "zod";

// Password policy: min 12 chars, at least one letter and one digit.
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .refine((v) => /[A-Za-z]/.test(v), "Password must contain a letter")
  .refine((v) => /[0-9]/.test(v), "Password must contain a digit");

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const login2faSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(6).max(20),
});
export type Login2faInput = z.infer<typeof login2faSchema>;

export const enable2faSchema = z.object({
  code: z.string().length(6),
});
export type Enable2faInput = z.infer<typeof enable2faSchema>;

export const disable2faSchema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(20),
});
export type Disable2faInput = z.infer<typeof disable2faSchema>;

// Response payloads
export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const login2faRequiredSchema = z.object({
  requires2fa: z.literal(true),
  challengeToken: z.string(),
});
export type Login2faRequired = z.infer<typeof login2faRequiredSchema>;

export const twoFactorSetupSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  qrDataUrl: z.string(),
});
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;

export const sessionInfoSchema = z.object({
  id: z.string(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  current: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;
