import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  CreateNoteInput,
  NoteGraph,
  NoteQuery,
  UpdateNoteInput,
} from "@bn/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  buildMeta,
  paginationArgs,
  type Paginated,
} from "../../common/utils/pagination";
import { uniqueSlug } from "../../common/utils/slug";
import { connectTags } from "../../common/utils/tags";
import { parseWikilinks } from "../../common/utils/wikilink";

type Tx = Prisma.TransactionClient;

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: NoteQuery): Promise<Paginated<unknown>> {
    const where: Prisma.NoteWhereInput = {};
    if (query.folderId) where.folderId = query.folderId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.pinned !== undefined) where.pinned = query.pinned;
    if (query.archived !== undefined) {
      where.archivedAt = query.archived ? { not: null } : null;
    }
    if (query.tags && query.tags.length > 0) {
      where.tags = { some: { name: { in: query.tags } } };
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { bodyMd: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const { skip, take, orderBy } = paginationArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { tags: true },
      }),
      this.prisma.note.count({ where }),
    ]);
    return { items, meta: buildMeta(query, total) };
  }

  async get(id: string) {
    return this.prisma.note.findUniqueOrThrow({
      where: { id },
      include: {
        tags: true,
        outgoingLinks: true,
        attachments: true,
      },
    });
  }

  async create(authorId: string, input: CreateNoteInput) {
    const slug = await uniqueSlug(input.title, (s) =>
      this.prisma.note.findUnique({ where: { slug: s } }).then((r) => r != null),
    );
    const tags = await connectTags(this.prisma, input.tags);

    const note = await this.prisma.$transaction(async (tx) => {
      const created = await tx.note.create({
        data: {
          title: input.title,
          slug,
          bodyMd: input.bodyMd ?? "",
          folderId: input.folderId ?? null,
          projectId: input.projectId ?? null,
          authorId,
          frontmatter: (input.frontmatter ?? {}) as Prisma.InputJsonValue,
          pinned: input.pinned ?? false,
          ...(tags ? { tags: { connect: tags } } : {}),
        },
      });

      // Index this note's own outgoing wikilinks.
      await this.reindexLinks(tx, created.id, created.title, created.bodyMd);

      // Resolve any previously-dangling links that pointed at this new title.
      await this.resolveIncomingByTitle(tx, created.id, created.title);

      return created;
    });

    return this.get(note.id);
  }

  async update(id: string, input: UpdateNoteInput) {
    const existing = await this.prisma.note.findUniqueOrThrow({
      where: { id },
    });
    const tags =
      input.tags !== undefined
        ? await connectTags(this.prisma, input.tags)
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.NoteUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.bodyMd !== undefined) data.bodyMd = input.bodyMd;
      if (input.folderId !== undefined) {
        data.folder =
          input.folderId === null
            ? { disconnect: true }
            : { connect: { id: input.folderId } };
      }
      if (input.projectId !== undefined) {
        data.project =
          input.projectId === null
            ? { disconnect: true }
            : { connect: { id: input.projectId } };
      }
      if (input.frontmatter !== undefined)
        data.frontmatter = input.frontmatter as Prisma.InputJsonValue;
      if (input.pinned !== undefined) data.pinned = input.pinned;
      if (input.archivedAt !== undefined) data.archivedAt = input.archivedAt;
      if (tags !== undefined) data.tags = { set: tags ?? [] };

      const updated = await tx.note.update({ where: { id }, data });

      // Re-index outgoing links whenever the body changed.
      if (input.bodyMd !== undefined) {
        await this.reindexLinks(tx, updated.id, updated.title, updated.bodyMd);
      }

      // If the title changed, dangling links elsewhere may now resolve, and
      // links that used to resolve to the old title may need refreshing.
      if (input.title !== undefined && input.title !== existing.title) {
        await this.resolveIncomingByTitle(tx, updated.id, updated.title);
      }
    });

    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    // Outgoing links cascade. Incoming links (targetNoteId) are set null and
    // become dangling again.
    await this.prisma.$transaction(async (tx) => {
      await tx.noteLink.updateMany({
        where: { targetNoteId: id },
        data: { targetNoteId: null, resolved: false },
      });
      await tx.note.delete({ where: { id } });
    });
  }

  // ----------------------------------------------------------------
  // Graph + backlinks
  // ----------------------------------------------------------------
  async graph(): Promise<NoteGraph> {
    const notes = await this.prisma.note.findMany({
      where: { archivedAt: null },
      include: {
        tags: { select: { name: true } },
        _count: { select: { outgoingLinks: true } },
      },
    });
    const links = await this.prisma.noteLink.findMany({
      where: { source: { archivedAt: null } },
    });
    return {
      nodes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        tags: n.tags.map((t) => t.name),
        linkCount: n._count.outgoingLinks,
      })),
      edges: links.map((l) => ({
        source: l.sourceNoteId,
        target: l.targetNoteId,
        resolved: l.resolved,
      })),
    };
  }

  async backlinks(id: string) {
    const note = await this.prisma.note.findUniqueOrThrow({
      where: { id },
      select: { id: true, title: true },
    });
    const links = await this.prisma.noteLink.findMany({
      where: { targetNoteId: note.id, resolved: true },
      include: {
        source: {
          select: { id: true, title: true, slug: true, updatedAt: true },
        },
      },
    });
    return links.map((l) => ({
      linkId: l.id,
      note: l.source,
    }));
  }

  // ----------------------------------------------------------------
  // Wikilink indexing helpers
  // ----------------------------------------------------------------

  // Delete all outgoing links for this note, then re-create one per unique
  // target, resolving each to an existing note by case-insensitive title.
  private async reindexLinks(
    tx: Tx,
    noteId: string,
    _title: string,
    bodyMd: string,
  ): Promise<void> {
    const targets = parseWikilinks(bodyMd);
    await tx.noteLink.deleteMany({ where: { sourceNoteId: noteId } });

    for (const targetTitle of targets) {
      // eslint-disable-next-line no-await-in-loop
      const match = await tx.note.findFirst({
        where: {
          title: { equals: targetTitle, mode: "insensitive" },
          id: { not: noteId },
        },
        select: { id: true },
      });
      // eslint-disable-next-line no-await-in-loop
      await tx.noteLink.create({
        data: {
          sourceNoteId: noteId,
          targetTitle,
          targetNoteId: match?.id ?? null,
          resolved: match != null,
        },
      });
    }
  }

  // After a note is created/renamed, resolve dangling links that referenced
  // its (new) title. This is the easily-missed second step.
  private async resolveIncomingByTitle(
    tx: Tx,
    noteId: string,
    title: string,
  ): Promise<void> {
    await tx.noteLink.updateMany({
      where: {
        targetTitle: { equals: title, mode: "insensitive" },
        sourceNoteId: { not: noteId },
        OR: [{ resolved: false }, { targetNoteId: null }],
      },
      data: { targetNoteId: noteId, resolved: true },
    });
  }
}
