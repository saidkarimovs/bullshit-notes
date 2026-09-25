import type { NextConfig } from "next";

// Netlify's Next.js runtime expects the default build output (.next). The
// standalone / custom distDir setup from the local handoff is intentionally
// dropped here so `@netlify/plugin-nextjs` can pick up the build.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
