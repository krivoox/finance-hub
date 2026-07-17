import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <head>
        {/* Anti-FOUC: runs before paint; outside the React client tree (Next 16 / React 19). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/*
        suppressHydrationWarning: extensions (e.g. ColorZilla) inject
        attributes like cz-shortcut-listen on <body> before React hydrates.
      */}
      <body
        className="flex min-h-full flex-col overflow-x-hidden md:h-full md:overflow-hidden"
        suppressHydrationWarning
      >
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
