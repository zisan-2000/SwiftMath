"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import type { InstitutePracticeAnalytics } from "@/server/analytics";
import { practiceDaySeries } from "@/lib/dashboard-insights";
import { MeasuredChart } from "@/components/ui/measured-chart";
import { DashboardLink } from "./dashboard-primitives";

export function AdminPracticeInsights({
  practice,
  canViewReports,
}: {
  practice: InstitutePracticeAnalytics;
  canViewReports: boolean;
}) {
  const [view, setView] = useState<"sessions" | "passRate">("sessions");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const gradient = useId().replace(/:/g, "");
  const days = practiceDaySeries(practice.daily);
  const selected = days.find((day) => day.date === selectedDate);
  const total = selected?.sessions ?? practice.totalSessions;
  const passed = selected?.passed ?? practice.passedSessions;
  const rate = total ? Math.round((passed / total) * 100) : null;
  return (
    <section
      className="executive-analytics"
      aria-label="Institute practice intelligence"
    >
      <div className="executive-chart">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="dashboard-eyebrow">Practice intelligence / 7 days</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
              How learning is moving
            </h2>
          </div>
          <div
            className="insight-switch"
            role="group"
            aria-label="Chart metric"
          >
            {(
              [
                ["sessions", "Sessions"],
                ["passRate", "Pass rate"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-series-key" aria-label="Chart series">
          <span>
            <i className="bg-primary" />
            {view === "sessions" ? "Finished attempts" : "Daily pass rate"}
          </span>
          {view === "sessions" && (
            <span>
              <i className="bg-success" />
              Passed attempts
            </span>
          )}
        </div>
        {practice.totalSessions > 0 ? (
          <MeasuredChart
            label={
              view === "sessions"
                ? "Daily finished and passed timed practice sessions"
                : "Daily practice pass rate; days without attempts have no percentage"
            }
          >
            <AreaChart
              data={days}
              margin={{ top: 22, right: 12, left: -20, bottom: 0 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={view === "passRate" ? [0, 100] : [0, "auto"]}
                unit={view === "passRate" ? "%" : ""}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) =>
                  payload[0]?.payload?.date ?? "Practice day"
                }
                formatter={(value, name) => [
                  view === "passRate" ? `${value}%` : value,
                  name,
                ]}
              />
              <Area
                type="monotone"
                dataKey={view}
                name={view === "sessions" ? "Finished sessions" : "Pass rate"}
                stroke="var(--primary)"
                fill={`url(#${gradient})`}
                strokeWidth={2.5}
                isAnimationActive={false}
                connectNulls={false}
              />
              {view === "sessions" && (
                <Area
                  type="monotone"
                  dataKey="passed"
                  name="Passed sessions"
                  stroke="var(--success)"
                  fill="transparent"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </MeasuredChart>
        ) : (
          <div className="executive-empty">
            <ChartNoAxesCombined
              className="size-8 text-primary"
              aria-hidden="true"
            />
            <h3>No practice sessions yet</h3>
            <p>
              Invite your students to finish a timed practice. Their activity
              will appear here.
            </p>
          </div>
        )}
        <div
          className="analytics-day-selector"
          role="group"
          aria-label="Inspect a practice day"
        >
          {days.map((day) => (
            <button
              type="button"
              key={day.date}
              aria-pressed={selectedDate === day.date}
              aria-label={`${day.label}, ${day.date}: ${day.sessions} finished sessions`}
              onClick={() =>
                setSelectedDate(selectedDate === day.date ? null : day.date)
              }
            >
              <span>{day.label}</span>
              <strong>{day.sessions}</strong>
              <span
                className="day-volume"
                aria-hidden="true"
                style={{
                  height: `${4 + (day.sessions / Math.max(1, ...days.map((d) => d.sessions))) * 16}px`,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <aside
        className="executive-outcomes"
        aria-label="Practice outcome breakdown"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="dashboard-eyebrow">Outcome snapshot</p>
          <ArrowUpRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div aria-live="polite">
          <p className="mt-3 text-xs text-muted-foreground">
            {selected ? `${selected.label} · ${selected.date}` : "All 7 days"}
          </p>
          <strong className="outcome-value">
            {rate == null ? "—" : `${rate}%`}
          </strong>
          <p className="dashboard-caption">of finished attempts passed</p>
          <div
            className="outcome-bar"
            role="img"
            aria-label={`${passed} passed, ${Math.max(0, total - passed)} did not pass`}
          >
            <span style={{ width: `${rate ?? 0}%` }} />
          </div>
          <dl className="outcome-list">
            <div>
              <dt>
                <i className="bg-success" />
                Passed
              </dt>
              <dd>{passed}</dd>
            </div>
            <div>
              <dt>
                <i className="bg-primary/20" />
                Did not pass
              </dt>
              <dd>{Math.max(0, total - passed)}</dd>
            </div>
            <div>
              <dt>Finished attempts</dt>
              <dd>{total}</dd>
            </div>
          </dl>
        </div>
        <div className="executive-outcome-footer">
          <p className="dashboard-caption">
            {selected
              ? "Selected-day results. Choose the day again to see the full week."
              : "Attempt outcomes, not a count of active students. Class marks and exam results stay separate."}
          </p>
          {selected && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="dashboard-text-link mt-3"
            >
              Reset to full week
            </button>
          )}
          <div className="mt-4">
            <DashboardLink
              href={canViewReports ? "/admin/reports" : "/admin/students"}
            >
              {canViewReports ? "Explore reports" : "View students"}
            </DashboardLink>
          </div>
        </div>
      </aside>
    </section>
  );
}
