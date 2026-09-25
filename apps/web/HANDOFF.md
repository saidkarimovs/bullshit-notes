# Backend integration handoff

## What is ready

- Next.js 15 frontend in src/app with strict TypeScript and Tailwind v4 tokens.
- Dark and light theme tokens, local variable fonts, responsive app shell, sidebar, command palette, and landing graph.
- Login, signup, and 2FA forms calling the planned auth endpoints.
- Dashboard endpoint wiring and five chart components.
- Projects, reports, and notes first working slice.
- In-memory access token and a shared refresh request in src/lib/api-client.ts.
- Query keys in src/lib/query-keys.ts and consumed response types in src/types/api.ts.

## Response envelope

Successful API responses are expected as { data: payload, meta?: pagination }. Errors are expected as { error: { code, message, details? } }. The API client unwraps data and throws ApiError with code, message, details, and status. api.list returns { items, meta } and supports payload data as an array or { items }.

Access tokens are kept only in memory. The backend must set an httpOnly bn_rt refresh cookie. On a 401 UNAUTHENTICATED response, one shared POST /api/auth/refresh request obtains a new access token and pending requests retry once. Middleware checks cookie presence for navigation convenience; all authorization must happen in the API.

## Demo mode

NEXT_PUBLIC_DEMO_MODE=true bypasses middleware and uses seed records saved to browser localStorage. It is for frontend review only. Set it to false before connecting real auth. Public environment variables are compiled into the frontend build. Production builds use .next-prod while development uses .next, avoiding build/dev cache collisions.

## Known contract gaps

- The backend is not in this archive, so live auth and data flows have not been exercised.
- Reports list, notes list, and projects list currently read GET payload arrays directly. Pagination metadata and URL-based filter persistence remain to be wired.
- Report status transitions follow the legal graph, but DUPLICATE and PAID need their extra input fields before live use.
- The CodeMirror editor is a usable source editor with sanitized Markdown preview. Wikilink autocomplete, tag syntax tree checks, AI inline actions, graph view, and full split resizing remain.
- Project scope edits are local only. Asset import and the remaining modules are not yet built.
- Dockerfile and compose.yaml run the frontend preview only. API, database, object storage, and workers are not included.
- The GitHub link on the landing points to the generic GitHub homepage until a repository URL is supplied.

## Suggested integration order

1. Implement auth endpoints and bn_rt cookie semantics, then test signup, login, refresh, 2FA, and logout.
2. Implement dashboard statistics and verify decimal money fields arrive as strings.
3. Implement projects, reports, and notes CRUD with the response envelope above.
4. Extend status changes with duplicateOfId and payout amount/currency, then connect the remaining modules.
5. Verify Markdown payloads are treated as hostile input throughout the stack. The current preview uses rehype-sanitize.


