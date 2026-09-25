// Import an ESM-only package from CommonJS-compiled NestJS code. Wrapping the
// dynamic import in a Function prevents TypeScript from down-levelling it to a
// require() call (which would fail for pure-ESM modules like unified/remark).
export function esmImport<T = unknown>(specifier: string): Promise<T> {
  return new Function("s", "return import(s)")(specifier) as Promise<T>;
}
