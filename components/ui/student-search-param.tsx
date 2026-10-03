"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StudentSearchParam({
  id,
  basePath,
  initialQuery,
}: {
  id: string;
  basePath: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const nextQuery = query.trim();
    if (nextQuery === initialQuery) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.delete("page");
      if (nextQuery) params.set("q", nextQuery);
      else params.delete("q");
      const search = params.toString();
      startTransition(() => {
        router.replace(search ? `${basePath}?${search}` : basePath);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [basePath, initialQuery, query, router]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="sr-only">
        Search students by name
      </Label>
      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search student by name…"
          autoComplete="off"
          aria-busy={pending}
          className="pl-9 pr-9"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear student search"
            className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {pending ? "Searching…" : "Results update as you type."}
      </p>
    </div>
  );
}
