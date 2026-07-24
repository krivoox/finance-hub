import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme, getThemeScript } from "@teispace/next-themes/server";

import { Providers } from "@/components/providers";
import { themeProviderOptions, themeScriptOptions } from "@/lib/theme";
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
  title: "Finance Hub",
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
  const themeScript = getThemeScript({
    ...themeScriptOptions,
    initialTheme: initialTheme ?? undefined,
  });

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
        className="flex min-h-full flex-col overflow-x-hidden md:h-full md:overflow-hidden"
        suppressHydrationWarning
      >
        {/* Anti-FOUC theme: beforeInteractive injects into <head> (Next Script). */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider
          {...themeProviderOptions}
          initialTheme={initialTheme ?? undefined}
          noScript
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
