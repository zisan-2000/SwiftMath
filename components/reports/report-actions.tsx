"use client";
import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportToCsv } from "@/lib/reports";
import { slugifyFilename } from "@/lib/csv";
import type { PerformanceReport } from "@/server/reports";

export function ReportActions({
  report,
  ownerId,
  disabled,
  isCurrent,
  preparePrint,
  finishPrint,
}: {
  report: PerformanceReport;
  ownerId: string;
  disabled: boolean;
  isCurrent: () => boolean;
  preparePrint: () => void;
  finishPrint: () => void;
}) {
  const [busy, setBusy] = useState<"print" | "csv" | null>(null);
  const [error, setError] = useState("");
  async function exportReport(kind: "print" | "csv") {
    if (busy || disabled || !isCurrent()) return;
    setBusy(kind);
    setError("");
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, filters: report.filters }),
      });
      if (
        !response.ok ||
        response.redirected ||
        !response.headers.get("content-type")?.includes("application/json")
      ) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error || "Unable to export. Check your sign-in and try again.",
        );
      }
      if (!isCurrent())
        throw new Error(
          "Filters changed. Generate the report again before exporting.",
        );
      if (kind === "csv") {
        const csv = reportToCsv(
          report.rows,
          report.filters,
          report.generatedAt,
          report.subjects,
          { institute: report.institute.name, subject: report.subject },
        );
        const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slugifyFilename(report.subject)}-report-${report.filters.from}-${report.filters.to}.csv`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        preparePrint();
        // Bound image/font waits so a failed remote logo cannot leave the button stuck.
        await Promise.race([
          Promise.all([
            document.fonts?.ready,
            ...Array.from(
              document.querySelectorAll<HTMLImageElement>(
                ".report-document img",
              ),
              (image) => image.decode().catch(() => undefined),
            ),
          ]),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
        if (!isCurrent())
          throw new Error(
            "Filters changed. Generate the report again before printing.",
          );
        window.print();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to export. Please try again.",
      );
    } finally {
      finishPrint();
      setBusy(null);
    }
  }
  return (
    <div className="report-screen-only mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={disabled || !!busy}
          onClick={() => void exportReport("print")}
        >
          {busy === "print" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Printer aria-hidden="true" />
          )}
          {busy === "print" ? "Preparing…" : "Print / Save PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !!busy}
          onClick={() => void exportReport("csv")}
        >
          {busy === "csv" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {busy === "csv" ? "Downloading…" : "Download CSV"}
        </Button>
        <p className="text-xs text-muted-foreground">
          PDF and CSV include all pages of this generated report. Choose “Save
          as PDF” in the print dialog.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
