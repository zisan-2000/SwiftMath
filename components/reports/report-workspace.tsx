"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { generatePerformanceReportAction } from "@/app/reports/actions";
import { ReportFiltersForm, type ReportOptions } from "./report-filters";
import { ReportActions } from "./report-actions";
import { ReportDocument } from "./report-document";
import {
  parseReportFilters,
  reportQueryString,
  type ReportQuery,
} from "@/lib/reports";
import type { PerformanceReport } from "@/server/reports";

function draftKey(query: ReportQuery) {
  try {
    return reportQueryString(parseReportFilters(query));
  } catch {
    return "invalid";
  }
}

export function ReportWorkspace({
  options,
  query,
  basePath,
  initialReport,
  initialError,
  ownerId,
  exportAllowed,
}: {
  options: ReportOptions;
  query: ReportQuery;
  basePath: string;
  initialReport: PerformanceReport | null;
  initialError: string | null;
  ownerId: string;
  exportAllowed: boolean;
}) {
  const [report, setReport] = useState(initialReport);
  const [filterState, setFilterState] = useState({ query, version: 0 });
  const [error, setError] = useState(initialError);
  const [identity, setIdentity] = useState({ ownerId, exportAllowed });
  const [key, setKey] = useState(() =>
    initialReport ? reportQueryString(initialReport.filters) : "invalid",
  );
  const [pending, startTransition] = useTransition();
  const [printing, setPrinting] = useState(false);
  const [generation, setGeneration] = useState(0);
  const currentKey = useRef(key);
  const currentReport = useRef(report);
  const saving = useRef(false);
  const result = useRef<HTMLDivElement>(null);
  const onDraftChange = useCallback((draft: ReportQuery) => {
    const next = draftKey(draft);
    currentKey.current = next;
    setKey(next);
  }, []);
  const dirty = !!report && key !== reportQueryString(report.filters);
  const blocked = dirty || pending || !!error;
  const isCurrent = useCallback(
    () =>
      !!report &&
      currentReport.current === report &&
      !saving.current &&
      !error &&
      identity.exportAllowed &&
      currentKey.current === reportQueryString(report.filters),
    [report, error, identity.exportAllowed],
  );
  const preparePrint = useCallback(() => {
    if (isCurrent()) flushSync(() => setPrinting(true));
  }, [isCurrent]);
  const finishPrint = useCallback(() => setPrinting(false), []);
  useEffect(() => {
    window.addEventListener("beforeprint", preparePrint);
    window.addEventListener("afterprint", finishPrint);
    return () => {
      window.removeEventListener("beforeprint", preparePrint);
      window.removeEventListener("afterprint", finishPrint);
    };
  }, [preparePrint, finishPrint]);
  useEffect(() => {
    if (generation) {
      result.current?.focus();
      result.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [generation]);
  function generate(form: FormData) {
    if (saving.current) return;
    saving.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await generatePerformanceReportAction(form);
        if (outcome.ok) {
          currentReport.current = outcome.report;
          setReport(outcome.report);
          setIdentity({
            ownerId: outcome.ownerId,
            exportAllowed: outcome.exportAllowed,
          });
          window.history.replaceState(
            null,
            "",
            `${basePath}?${reportQueryString(outcome.report.filters)}`,
          );
        } else setError(outcome.error);
      } catch {
        setError(
          "Unable to generate the report. Check your connection or sign-in, then try again.",
        );
      } finally {
        saving.current = false;
        setGeneration((value) => value + 1);
      }
    });
  }
  function reset() {
    currentReport.current = null;
    currentKey.current = "invalid";
    setReport(null);
    setError(null);
    setKey("invalid");
    setGeneration(0);
    setPrinting(false);
    setFilterState((old) => ({ query: {}, version: old.version + 1 }));
    window.history.replaceState(null, "", basePath);
  }
  return (
    <div
      className="min-w-0"
      data-report-blocked={
        blocked || !identity.exportAllowed ? "true" : "false"
      }
    >
      <ReportFiltersForm
        key={filterState.version}
        options={options}
        query={filterState.query}
        basePath={basePath}
        pending={pending}
        onDraftChange={onDraftChange}
        onGenerate={generate}
        onReset={reset}
      />
      <div
        ref={result}
        tabIndex={-1}
        className="min-w-0 scroll-mt-24 outline-none"
        aria-busy={pending}
      >
        <div className="report-screen-only" aria-live="polite">
          {pending && (
            <p className="mb-4 text-sm" role="status">
              Generating your report…
            </p>
          )}
          {error && (
            <p
              className="mb-4 rounded-lg border border-destructive p-4 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          {dirty && (
            <p
              className="mb-4 rounded-lg border border-warning bg-warning/10 p-4 text-sm"
              role="status"
            >
              Filters changed. Generate the report again before exporting. The
              preview below still shows the last generated report.
            </p>
          )}
          {!pending && !error && report && generation > 0 && !dirty && (
            <p className="mb-3 text-sm" role="status">
              Report ready · {report.rows.length} records.
            </p>
          )}
        </div>
        {report ? (
          <>
            {identity.exportAllowed && (
              <ReportActions
                report={report}
                ownerId={identity.ownerId}
                disabled={blocked}
                isCurrent={isCurrent}
                preparePrint={preparePrint}
                finishPrint={finishPrint}
              />
            )}
            <p className="report-print-warning hidden">
              Generate the report again using your selected filters before
              printing.
            </p>
            <ReportDocument
              key={report.generatedAt + generation}
              report={report}
              printing={printing}
            />
          </>
        ) : (
          !error && (
            <p className="report-screen-only rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Choose your filters and select Generate report. Then print, save
              as PDF or download CSV.
            </p>
          )
        )}
      </div>
    </div>
  );
}
