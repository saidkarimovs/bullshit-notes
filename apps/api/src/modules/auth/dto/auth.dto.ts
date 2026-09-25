// Auth DTOs are the shared Zod schemas. Re-exported here so the module has a
// local dto/ surface and controllers validate with ZodValidationPipe.
export {
  signupSchema,
  loginSchema,
  login2faSchema,
  enable2faSchema,
  disable2faSchema,
} from "@bn/shared";
export type {
  SignupInput,
  LoginInput,
  Login2faInput,
  Enable2faInput,
  Disable2faInput,
} from "@bn/shared";
