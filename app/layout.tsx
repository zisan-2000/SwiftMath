import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import { PwaShell } from "@/components/pwa/pwa-shell";
import { Toaster } from "@/components/ui/sonner";
import { AppBackground } from "@/components/ui/app-background";
import { APP_NAME, APP_TAGLINE, PLATFORM_ICON_URLS } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: PLATFORM_ICON_URLS.icon192, sizes: "192x192", type: "image/png" },
      { url: PLATFORM_ICON_URLS.icon512, sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: PLATFORM_ICON_URLS.favicon, type: "image/x-icon" }],
    apple: [{ url: PLATFORM_ICON_URLS.appleTouch, sizes: "180x180" }],
  },
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#181722" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes sets the theme `class`/color-scheme
    // on <html> before hydration, so the server/client markup intentionally
    // differs on this element for one paint.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaShell>
            <AppBackground />
            {children}
            <PwaRuntime />
            <Toaster />
          </PwaShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
