# === Web image (Next.js) ===
# Multi-stage build. The web app itself is owned by another developer;
# this Dockerfile only defines how it is built and run.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- deps ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

# --- build ---
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN pnpm --filter @bn/shared build
RUN pnpm --filter @bn/web build

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build /repo/node_modules ./node_modules
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
