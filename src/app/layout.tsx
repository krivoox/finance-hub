import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme } from "@teispace/next-themes/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { env } from "@/lib/env";
import { themeProviderOptions } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.BETTER_AUTH_URL),
  title: {
    default: "Finance Hub",
    template: "%s · Finance Hub",
  },
  description: "Centro de administración financiera del hogar",
  applicationName: "Finance Hub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance Hub",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#12151c" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme = await getTheme();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} min-h-full md:h-full`}
      suppressHydrationWarning
    >
      {/*
        suppressHydrationWarning: extensions (e.g. ColorZilla) inject
        attributes like cz-shortcut-listen on <body> before React hydrates.
      */}
      <body
        className="flex min-h-full flex-col overflow-x-hidden"
        suppressHydrationWarning
      >
        <ThemeProvider
          {...themeProviderOptions}
          initialTheme={initialTheme ?? undefined}
        >
          <Providers>{children}</Providers>
          <RegisterServiceWorker />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
