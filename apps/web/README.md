# SkyVision

SkyVision is a self-hosted workspace for security research, findings, notes, targets, and disclosure work. This repository is the first frontend implementation slice from the two supplied specifications.

## Run locally

1. Install Node.js 22 or later.
2. Run npm install in this directory.
3. Copy .env.example to .env.local.
4. Run npm run dev and open http://localhost:3000.

The included compose.yaml can run the frontend preview with docker compose up -d. The example environment enables demo mode. Demo data is saved in the browser localStorage so the UI can be explored before a backend is connected.

## Connect a backend

Set NEXT_PUBLIC_DEMO_MODE=false and set NEXT_PUBLIC_API_BASE_URL to the API origin, or leave the latter empty if the API is served under the same origin. Rebuild after changing public environment variables. Read HANDOFF.md for the contract and integration gaps.

## Verify

Run npm run typecheck, npm run build, and npm audit. Keep the dev server stopped during a production build on this OneDrive workspace. The app uses Next.js 15, React 19, TypeScript strict mode, and Tailwind CSS v4.

The supplied documents use a different working name and describe a four-developer integration process. SkyVision is the product name here; API shapes and component paths follow those documents where implemented. This is a frontend source handoff, not a deployable full stack.


