import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Building2,
  GraduationCap,
  ShieldCheck,
  Sigma,
  Trophy,
  Users,
} from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroAccent } from "@/components/ui/app-background";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    type: "website",
  },
};

const FEATURES = [
  {
    icon: Building2,
    title: "For institutes",
    description:
      "White-label branding, curriculum levels, and analytics — each tenant isolated from day one.",
  },
  {
    icon: Users,
    title: "For teachers",
    description:
      "Create groups, assign students to levels, and track progress without touching admin settings.",
  },
  {
    icon: GraduationCap,
    title: "For students",
    description:
      "Timed practice with server-verified scoring, personal progress charts, and institute rankings.",
  },
] as const;

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    label: "Server-verified scoring",
    detail: "Timers and grades run on the server — not in the browser.",
  },
  {
    icon: Brain,
    label: "Structured curriculum",
    detail: "Addition through division, level prerequisites, and review mode.",
  },
  {
    icon: Trophy,
    label: "Meaningful rankings",
    detail: "Leaderboards scoped by group, level, and time period.",
  },
] as const;

/**
 * Public marketing landing page (Phase 2.8). Product overview + sign-in CTA.
 * Role dashboards stay behind authentication.
 */
export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col">
      <HeroAccent />

      {/* Hero */}
      <header className="relative flex flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sigma className="h-7 w-7" />
        </span>

        <Badge variant="secondary" className="mt-6">
          Multi-institute platform
        </Badge>

        <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {APP_NAME}
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          {APP_TAGLINE}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/forgot-password">Forgot password?</Link>
          </Button>
        </div>
      </header>

      {/* Features */}
      <section
        aria-labelledby="features-heading"
        className="relative mx-auto w-full max-w-5xl px-6 pb-16"
      >
        <h2
          id="features-heading"
          className="mb-8 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Built for every role
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust / product highlights */}
      <section
        aria-labelledby="trust-heading"
        className="relative border-t border-border/60 bg-card/40 px-6 py-16 backdrop-blur-sm"
      >
        <div className="mx-auto w-full max-w-5xl">
          <h2
            id="trust-heading"
            className="mb-8 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Why institutes choose us
          </h2>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TRUST_POINTS.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative flex flex-col items-center px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Ready to practise?
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Accounts are provisioned by your institute. Sign in with the email your
          admin or teacher gave you.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/login">Sign in to your account</Link>
        </Button>
      </section>

      <footer className="relative mt-auto border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <nav
          aria-label="Legal"
          className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        >
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
        </nav>
      </footer>
    </div>
  );
}
