import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <Badge variant="muted">403</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Permission required
        </h1>
        <p className="text-muted-foreground">
          Your account does not have permission to perform this action. Contact
          your institute admin if this access should be enabled.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Go to {APP_NAME}</Link>
        </Button>
      </main>
    </div>
  );
}
