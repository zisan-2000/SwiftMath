"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { GroupComparisonPoint } from "@/lib/teacher-dashboard-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TeacherGroupComparisonChartProps {
  data: GroupComparisonPoint[];
  empty?: boolean;
}

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
          {entry.name === "Pass rate" ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

/** Compare practice volume and pass rate across the teacher's groups. */
export function TeacherGroupComparisonChart({
  data,
  empty,
}: TeacherGroupComparisonChartProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Group comparison</CardTitle>
        <CardDescription>
          Sessions and pass rate by group over the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {empty ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Create a group and add students to compare activity across classes.
          </p>
        ) : (
          <div
            className="h-64 w-full"
            role="img"
            aria-label="Bar chart comparing sessions and pass rate by group"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border"
                />
                <XAxis
                  dataKey="groupName"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  yAxisId="sessions"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                <Bar
                  yAxisId="sessions"
                  dataKey="sessions"
                  name="Sessions"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  yAxisId="rate"
                  dataKey="passRate"
                  name="Pass rate"
                  fill="var(--success)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
