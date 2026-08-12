"use client";

import dynamic from "next/dynamic";

/**
 * Analytics / Speed Insights off the interaction critical path (SPEC-20 FR-07).
 */
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((mod) => mod.Analytics),
  { ssr: false },
);

const SpeedInsights = dynamic(
  () =>
    import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false },
);

export function DeferredTelemetry() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
