// Slug helpers. Base slugify plus a collision-resolving generator that
// appends -2, -3, ... until the candidate is unique.

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return base || "item";
}

// exists: async predicate returning true when a slug is already taken.
export async function uniqueSlug(
  input: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}
