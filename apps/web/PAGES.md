# Route and endpoint map

| Route | State | API endpoints used when demo mode is off |
| --- | --- | --- |
| / | Working landing page; 3D graph on desktop, SVG fallback | None |
| /login | Form built; needs backend | POST /api/auth/login |
| /signup | Form built; needs backend | POST /api/auth/signup |
| /verify-2fa | Form built; challenge kept in memory | POST /api/auth/verify-2fa |
| /dashboard | Working preview with seeded data | GET /api/stats/overview, /severity, /findings-over-time, /status-funnel, /earnings, /activity-heatmap; GET /api/vdp/pipeline; GET /api/audit |
| /projects | Working list and create flow | GET and POST /api/projects |
| /projects/[id] | Overview, scope checker, linked reports and notes | GET /api/projects/:id, GET /api/reports?projectId=, GET /api/notes?projectId= |
| /reports | Searchable, sortable list | GET /api/reports |
| /reports/new | Draft creation with Markdown templates | POST /api/reports |
| /reports/[id] | Detail, Markdown edit, legal status transitions | GET and PATCH /api/reports/:id, POST /api/reports/:id/status |
| /notes | Three-pane list, CodeMirror source, sanitized Markdown preview, demo autosave | GET and POST /api/notes, PATCH /api/notes/:id |

The sidebar also contains links to assets, bounty, VDP, CVE, payloads, checklists, vault, tools, timeline, and settings. Those routes are not implemented yet and currently return 404. The source specifications explicitly allowed sidebar links to exist ahead of feature pages.

Current project detail tabs for Assets, Checklists, and Activity are informational only. Scope text entered there is local state and is not persisted. The advanced editor features described in the source spec are not yet present.
