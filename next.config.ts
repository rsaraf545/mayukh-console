import type { NextConfig } from "next";

// Pinned: a stray lockfile in $HOME otherwise makes Next infer the wrong workspace root.
const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
};

export default nextConfig;
