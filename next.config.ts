import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /**
   * Client Router Cache — `dynamic: 0` keeps money listados fresh after mutations.
   * Perceived speed on soft-nav comes from `loading.tsx` + closing the mobile sidebar.
   * See docs/architecture.md §7.2.
   */
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
