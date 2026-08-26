import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme } from "@teispace/next-themes/server";

import { Providers } from "@/components/providers";
import { DeferredTelemetry } from "@/components/pwa/deferred-telemetry";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { env } from "@/lib/env";
import { themeProviderOptions } from "@/lib/theme";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-heading",
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
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#161d2e" },
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
      className={`${plusJakarta.variable} ${nunito.variable} ${geistMono.variable} min-h-full max-w-full overflow-x-hidden md:h-full`}
      suppressHydrationWarning
    >
      {/*
        suppressHydrationWarning: extensions (e.g. ColorZilla) inject
        attributes like cz-shortcut-listen on <body> before React hydrates.
      */}
      <body
        className="flex min-h-full max-w-full flex-col overflow-x-hidden"
        suppressHydrationWarning
      >
        <ThemeProvider
          {...themeProviderOptions}
          initialTheme={initialTheme ?? undefined}
        >
          <Providers>{children}</Providers>
          <RegisterServiceWorker />
          <DeferredTelemetry />
        </ThemeProvider>
      </body>
    </html>
  );
}
