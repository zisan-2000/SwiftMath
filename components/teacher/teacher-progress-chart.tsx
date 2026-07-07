"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

import type { DailyProgressPoint } from "@/lib/teacher-dashboard-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface TeacherProgressChartProps {
  data: DailyProgressPoint[];
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
          {entry.name?.includes("rate") || entry.name?.includes("Accuracy")
            ? "%"
            : ""}
        </p>
      ))}
    </div>
  );
}

/** Line chart of daily pass rate and accuracy for the teacher dashboard. */
export function TeacherProgressChart({
  data,
  empty,
}: TeacherProgressChartProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Progress trend</CardTitle>
        <CardDescription>
          Daily pass rate and average accuracy over the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {empty ? (
          <EmptyState
            icon={TrendingUp}
            title="No finished attempts yet"
            description="Progress trends will appear here once students practise this week."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div
            className="h-64 w-full"
            role="img"
            aria-label="Line chart of daily pass rate and average accuracy"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
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
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  name="Pass rate"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgAccuracy"
                  name="Avg accuracy"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
