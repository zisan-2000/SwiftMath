"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import type { DailySessionCount } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MeasuredChart } from "@/components/ui/measured-chart";

interface PracticeActivityChartProps {
  data: DailySessionCount[];
  /** Shown when every day has zero sessions. */
  empty?: boolean;
  /** Optional override for the card description line. */
  description?: string;
}

/** Custom tooltip styled to match the app theme. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="text-muted-foreground"
          style={{ color: entry.color }}
        >
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Bar chart of daily practice attempts. Client-only because Recharts needs the
 * DOM; data is fetched and scoped server-side (institute- or teacher-scoped).
 */
export function PracticeActivityChart({
  data,
  empty,
  description = "Finished attempts over the last 7 days",
}: PracticeActivityChartProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Practice activity</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {empty ? (
          <EmptyState
            icon={BarChart3}
            title="No practice sessions yet"
            description="Activity will appear here once students complete attempts this week."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <MeasuredChart
            label="Bar chart of daily practice sessions for the last seven days"
          >
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
              <Bar
                dataKey="sessions"
                name="Sessions"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="passed"
                name="Passed"
                fill="var(--success)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </MeasuredChart>
        )}
      </CardContent>
    </Card>
  );
}
