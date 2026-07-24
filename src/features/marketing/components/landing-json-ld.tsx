import {
  LANDING_FAQ,
  LANDING_META,
} from "@/features/marketing/content";
import { getSiteUrl } from "@/lib/site-url";

export function LandingJsonLd() {
  const siteUrl = getSiteUrl();

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Finance Hub",
        url: siteUrl,
        description: LANDING_META.description,
        logo: `${siteUrl}/icons/icon-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Finance Hub",
        description: LANDING_META.description,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "es-AR",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: "Finance Hub",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: LANDING_META.description,
        inLanguage: "es",
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: LANDING_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
