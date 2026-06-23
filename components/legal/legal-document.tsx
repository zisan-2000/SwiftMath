import type { ReactNode } from "react";
import Link from "next/link";

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/** Shared layout for public legal pages (privacy, terms). */
export function LegalDocument({
  title,
  lastUpdated,
  children,
}: LegalDocumentProps) {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>

        <header className="mt-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="mt-8 space-y-10 text-foreground">{children}</div>
      </main>
    </div>
  );
}

/** A single section within a legal document. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
