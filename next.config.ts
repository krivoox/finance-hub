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
  /**
   * CDN cache contract (SPEC-20 / architecture §7.3):
   * - Production `/_next/static` → long-lived immutable (content-hashed filenames)
   * - `next dev` → `no-store` + `Clear-Site-Data: cache` on HTML
     (Turbopack reuses chunk URLs; a leftover `immutable` entry hydrates stale JS)
   * - authenticated money HTML → private, no-store (never “fix” TTFB with stale saldos)
   */
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const staticAssetHeaders = isProd
      ? [
          {
            source: "/_next/static/:path*",
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
              },
            ],
          },
        ]
      : [
          {
            source: "/_next/static/:path*",
            headers: [
              {
                key: "Cache-Control",
                value: "no-store",
              },
            ],
          },
          {
            source: "/((?!_next/|api/|sw\\.js).*)",
            headers: [
              {
                key: "Clear-Site-Data",
                value: '"cache"',
              },
            ],
          },
        ];

    return [
      ...staticAssetHeaders,
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/offline",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/dashboard",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/accounts",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/accounts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/transactions",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/transactions/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/budgets",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/budgets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/goals",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/goals/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/groups",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/groups/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
