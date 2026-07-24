import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingJsonLd } from "@/features/marketing/components/landing-json-ld";
import { LandingPage } from "@/features/marketing/components/landing-page";
import { LANDING_META } from "@/features/marketing/content";
import { getSession } from "@/lib/session";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    absolute: LANDING_META.title,
  },
  description: LANDING_META.description,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "Finance Hub",
    title: LANDING_META.title,
    description: LANDING_META.description,
    images: [
      {
        url: `${siteUrl}/icons/icon-512.png`,
        width: 512,
        height: 512,
        alt: "Finance Hub",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: LANDING_META.title,
    description: LANDING_META.description,
    images: [`${siteUrl}/icons/icon-512.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  const session = await getSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
