const resource = (name: string) => ({
  list: (p: object = {}) => [name, p] as const,
  detail: (id: string) => [name, id] as const,
});

export const qk = {
  me: ["me"] as const,
  stats: {
    overview: () => ["stats", "overview"] as const,
    severity: () => ["stats", "severity"] as const,
    overTime: (p: object) => ["stats", "over-time", p] as const,
    funnel: () => ["stats", "funnel"] as const,
    earnings: (p: object) => ["stats", "earnings", p] as const,
    heatmap: (d: number) => ["stats", "heatmap", d] as const,
  },
  reports: resource("reports"),
  projects: resource("projects"),
  notes: {
    ...resource("notes"),
    graph: () => ["notes", "graph"] as const,
    backlinks: (id: string) => ["notes", id, "backlinks"] as const,
  },
  assets: resource("assets"),
  cve: resource("cve"),
  bounty: {
    ...resource("bounty"),
    overview: () => ["bounty", "overview"] as const,
    programs: () => ["bounty", "programs"] as const,
    sessions: () => ["bounty", "sessions"] as const,
  },
  vdp: {
    ...resource("vdp"),
    pipeline: () => ["vdp", "pipeline"] as const,
  },
  payloads: resource("payloads"),
  checklists: resource("checklists"),
  vault: resource("vault"),
  webhooks: resource("webhooks"),
  ai: {
    settings: () => ["ai", "settings"] as const,
    usage: () => ["ai", "usage"] as const,
  },
  timeline: resource("timeline"),
  search: (q: string) => ["search", q] as const,
};
