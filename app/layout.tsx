import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // SEFT Abacus is the platform brand. Per-institute white-labelling
  // (e.g. a SEFT-specific title) will be layered on in a later phase.
  title: "SEFT Abacus",
  description:
    "Timed mental-math and abacus practice platform for institutes, teachers, and students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Browser extensions (Grammarly, ColorZilla, …) inject attributes on
          <body> before React hydrates, which would otherwise log a hydration
          mismatch. suppressHydrationWarning silences that one element. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
