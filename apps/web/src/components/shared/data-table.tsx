"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; sortable?: boolean; className?: string };
export type TablePagination = { page: number; perPage: number; total: number; onChange: (page: number) => void };
export type TableSort = { key: string; direction: "asc" | "desc" };

/** Generic table for API lists. Example: <DataTable columns={[{ key: "name", header: "Name", cell: item => item.name }]} data={items} /> */
export function DataTable<T>({ columns, data, isLoading = false, onRowClick, sort, onSortChange, pagination, emptyTitle = "No results" }: {
  columns: Column<T>[]; data: T[]; isLoading?: boolean; onRowClick?: (row: T) => void;
  sort?: TableSort; onSortChange?: (sort: TableSort) => void; pagination?: TablePagination; emptyTitle?: string;
}) {
  return <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="table"><thead><tr>{columns.map(column => <th key={column.key} className={column.className}><button type="button" disabled={!column.sortable} className="inline-flex items-center gap-1 px-4 text-left disabled:cursor-default" onClick={() => onSortChange?.({ key: column.key, direction: sort?.key === column.key && sort.direction === "asc" ? "desc" : "asc" })}>{column.header}{sort?.key === column.key && (sort.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</button></th>)}</tr></thead><tbody>{isLoading ? Array.from({ length: 6 }, (_, i) => <tr key={i}>{columns.map(column => <td key={column.key} className="px-4"><Skeleton className="h-4 w-3/4" /></td>)}</tr>) : data.map((row, index) => <tr key={index} className={onRowClick ? "cursor-pointer" : ""} onClick={() => onRowClick?.(row)}>{columns.map(column => <td key={column.key} className={"px-4 " + (column.className ?? "")}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div>{!isLoading && data.length === 0 && <EmptyState icon={Database} title={emptyTitle} description="Try adjusting your filters or create a new item." />}{pagination && pagination.total > pagination.perPage && <div className="flex items-center justify-between border-t border-subtle px-4 py-2 text-secondary"><span>{pagination.total} results</span><div className="flex items-center gap-2"><Button size="sm" disabled={pagination.page <= 1} onClick={() => pagination.onChange(pagination.page - 1)}>Previous</Button><span className="mono">{pagination.page}</span><Button size="sm" disabled={pagination.page * pagination.perPage >= pagination.total} onClick={() => pagination.onChange(pagination.page + 1)}>Next</Button></div></div>}</div>;
}
