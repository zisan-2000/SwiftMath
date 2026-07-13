import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {APP_NAME} needs an internet connection for practice, exams, ranking,
            and account data. Reconnect and open the dashboard again.
          </p>
          <Button asChild>
            <Link href="/student">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
