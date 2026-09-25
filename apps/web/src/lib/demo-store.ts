import { demoNotes, demoProjects, demoReports } from "./demo-data";
import type { Note, Project, Report } from "@/types/api";

type Collection = "notes" | "reports" | "projects";
type Entity = Note | Report | Project;
const seeds = { notes: demoNotes, reports: demoReports, projects: demoProjects };

export function readDemo<T extends Entity>(collection: Collection): T[] {
  if (typeof window === "undefined") return seeds[collection] as T[];
  try {
    const saved = localStorage.getItem("skyvision-demo-" + collection);
    return saved ? JSON.parse(saved) as T[] : seeds[collection] as T[];
  } catch { return seeds[collection] as T[]; }
}

export function writeDemo<T extends Entity>(collection: Collection, items: T[]) {
  if (typeof window !== "undefined") localStorage.setItem("skyvision-demo-" + collection, JSON.stringify(items));
}

export function upsertDemo<T extends Entity>(collection: Collection, item: T) {
  const current = readDemo<T>(collection);
  writeDemo(collection, [item, ...current.filter(existing => existing.id !== item.id)]);
  return item;
}

export function deleteDemo(collection: Collection, id: string) {
  writeDemo(collection, readDemo(collection).filter(item => item.id !== id));
}
