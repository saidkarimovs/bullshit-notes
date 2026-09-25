import { beforeEach, describe, expect, it } from "vitest";
import { NotesService } from "./notes.service";

// ---------------------------------------------------------------------------
// Minimal in-memory Prisma fake covering exactly what NotesService.create and
// its link-indexing helpers touch. $transaction(fn) runs against the same fake.
// ---------------------------------------------------------------------------
interface FakeNote {
  id: string;
  title: string;
  slug: string;
  bodyMd: string;
  archivedAt: Date | null;
}
interface FakeLink {
  id: string;
  sourceNoteId: string;
  targetNoteId: string | null;
  targetTitle: string;
  resolved: boolean;
}

function ci(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function makeFake() {
  const notes: FakeNote[] = [];
  const links: FakeLink[] = [];
  let seq = 0;
  const nid = () => `n${++seq}`;
  const lid = () => `l${++seq}`;

  const note = {
    findUnique: async ({ where }: any) => {
      if (where.slug)
        return notes.find((n) => n.slug === where.slug) ?? null;
      if (where.id) return notes.find((n) => n.id === where.id) ?? null;
      return null;
    },
    findFirst: async ({ where }: any) => {
      return (
        notes.find(
          (n) =>
            ci(n.title, where.title.equals) &&
            (where.id?.not ? n.id !== where.id.not : true),
        ) ?? null
      );
    },
    findUniqueOrThrow: async ({ where }: any) => {
      const n = notes.find((x) => x.id === where.id);
      if (!n) throw new Error("note not found");
      return {
        ...n,
        tags: [],
        attachments: [],
        outgoingLinks: links.filter((l) => l.sourceNoteId === n.id),
      };
    },
    create: async ({ data }: any) => {
      const n: FakeNote = {
        id: nid(),
        title: data.title,
        slug: data.slug,
        bodyMd: data.bodyMd ?? "",
        archivedAt: null,
      };
      notes.push(n);
      return n;
    },
  };

  const noteLink = {
    deleteMany: async ({ where }: any) => {
      for (let i = links.length - 1; i >= 0; i--) {
        if (links[i].sourceNoteId === where.sourceNoteId) links.splice(i, 1);
      }
      return { count: 0 };
    },
    create: async ({ data }: any) => {
      const l: FakeLink = {
        id: lid(),
        sourceNoteId: data.sourceNoteId,
        targetNoteId: data.targetNoteId ?? null,
        targetTitle: data.targetTitle,
        resolved: data.resolved ?? false,
      };
      links.push(l);
      return l;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const l of links) {
        const titleMatch = ci(l.targetTitle, where.targetTitle.equals);
        const notSelf = where.sourceNoteId?.not
          ? l.sourceNoteId !== where.sourceNoteId.not
          : true;
        const orMatch = !l.resolved || l.targetNoteId === null;
        if (titleMatch && notSelf && orMatch) {
          l.targetNoteId = data.targetNoteId;
          l.resolved = data.resolved;
          count++;
        }
      }
      return { count };
    },
  };

  const prisma: any = {
    note,
    noteLink,
    $transaction: async (arg: any) => {
      if (typeof arg === "function") return arg(prisma);
      return Promise.all(arg);
    },
  };

  return { prisma, notes, links };
}

describe("wikilink resolver", () => {
  let fake: ReturnType<typeof makeFake>;
  let service: NotesService;

  beforeEach(() => {
    fake = makeFake();
    service = new NotesService(fake.prisma);
  });

  it("resolves a link to an already-existing note immediately", async () => {
    await service.create("u1", { title: "Alpha", bodyMd: "", frontmatter: {}, pinned: false });
    await service.create("u1", {
      title: "Beta",
      bodyMd: "points at [[Alpha]]",
      frontmatter: {},
      pinned: false,
    });
    const link = fake.links.find((l) => l.targetTitle === "Alpha");
    expect(link).toBeDefined();
    expect(link!.resolved).toBe(true);
    expect(link!.targetNoteId).not.toBeNull();
  });

  it("leaves a link dangling when the target does not exist yet", async () => {
    await service.create("u1", {
      title: "Recon Playbook",
      bodyMd: "start with [[Subdomain Enumeration]]",
      frontmatter: {},
      pinned: false,
    });
    const link = fake.links.find(
      (l) => l.targetTitle === "Subdomain Enumeration",
    );
    expect(link).toBeDefined();
    expect(link!.resolved).toBe(false);
    expect(link!.targetNoteId).toBeNull();
  });

  it("resolves previously-dangling links when the target note is later created", async () => {
    await service.create("u1", {
      title: "Recon Playbook",
      bodyMd: "start with [[Subdomain Enumeration]]",
      frontmatter: {},
      pinned: false,
    });
    // The critical second step: creating the target back-fills the dangling link.
    const target = await service.create("u1", {
      title: "Subdomain Enumeration",
      bodyMd: "the enum note",
      frontmatter: {},
      pinned: false,
    });

    const link = fake.links.find(
      (l) => l.targetTitle === "Subdomain Enumeration",
    );
    expect(link).toBeDefined();
    expect(link!.resolved).toBe(true);
    expect(link!.targetNoteId).toBe(target.id);
  });

  it("matches targets case-insensitively", async () => {
    await service.create("u1", { title: "SSRF Notes", bodyMd: "", frontmatter: {}, pinned: false });
    await service.create("u1", {
      title: "Index",
      bodyMd: "see [[ssrf notes]]",
      frontmatter: {},
      pinned: false,
    });
    const link = fake.links.find((l) => l.targetTitle === "ssrf notes");
    expect(link!.resolved).toBe(true);
  });
});
