import type { PaginationMeta, PaginationQuery } from "@bn/shared";

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export function paginationArgs(query: PaginationQuery): {
  skip: number;
  take: number;
  orderBy: Record<string, "asc" | "desc">;
} {
  return {
    skip: (query.page - 1) * query.perPage,
    take: query.perPage,
    orderBy: { [query.sort]: query.order },
  };
}

export function buildMeta(
  query: PaginationQuery,
  total: number,
): PaginationMeta {
  return {
    page: query.page,
    perPage: query.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.perPage)),
  };
}
