import Link from "next/link";
import { Sigma } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

/**
 * Institute wordmark + product badge. Links back to the role's dashboard. The
 * institute name is the prominent (white-label) line; the platform name sits
 * underneath as a small caption.
 */
export function Brand({
  instituteName,
  role,
  className,
}: {
  instituteName: string;
  role: Role;
  className?: string;
}) {
  return (
    <Link
      href={HOME_BY_ROLE[role]}
      className={cn(
        "flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Sigma className="h-5 w-5" />
      </span>
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
