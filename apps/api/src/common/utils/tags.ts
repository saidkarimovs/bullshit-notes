import type { PrismaService } from "../../infra/prisma/prisma.service";
import { slugify } from "./slug";

// Upserts tags by name and returns connect targets ({ id }[]).
// Returns undefined when no tags were supplied (leave the relation untouched).
export async function connectTags(
  prisma: PrismaService,
  names: string[] | undefined,
): Promise<{ id: string }[] | undefined> {
  if (names === undefined) return undefined;
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: { id: string }[] = [];
  for (const name of unique) {
    const slug = slugify(name);
    // eslint-disable-next-line no-await-in-loop
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug },
    });
    ids.push({ id: tag.id });
  }
  return ids;
}
