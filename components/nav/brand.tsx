import Link from "next/link";
import { Sigma } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { roleHomePath } from "@/lib/roles";
import type { Role } from "@/lib/generated/prisma/enums";

/**
 * The brand mark: an institute-supplied logo (white-label) when set, otherwise
 * the default platform glyph. Kept as a small square so it sits cleanly in the
 * sidebar and mobile header.
 */
function BrandMark({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      // Arbitrary tenant-supplied host, so plain <img> (next/image needs
      // configured domains). Decorative — the institute name labels it.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg border border-border object-contain"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <Sigma className="h-5 w-5" />
    </span>
  );
}

/**
 * Institute wordmark + product badge. Links back to the role's dashboard. The
 * institute name is the prominent (white-label) line; the platform name sits
 * underneath as a small caption.
 */
export function Brand({
  instituteName,
  role,
  logoUrl,
  className,
}: {
  instituteName: string;
  role: Role;
  /** Optional white-label logo URL; falls back to the platform glyph. */
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <Link
      href={roleHomePath(role)}
      className={cn(
        "flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <BrandMark logoUrl={logoUrl} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">
          {instituteName}
        </span>
        <span className="block text-xs leading-tight text-muted-foreground">
          {APP_NAME}
        </span>
      </span>
    </Link>
  );
}
