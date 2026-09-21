"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface TrendPoint {
  date: string;
  label: string;
  averagePercentage: number;
}

export function ClassPerformanceTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = [...data].reverse();
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Class performance trend</CardTitle>
        <CardDescription>
          Group average from teacher-entered marks; absent students count as zero.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No class performance yet"
            description="Save the first date-wise class record to start the trend."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div
            className="h-64 w-full"
            role="img"
            aria-label="Line chart of date-wise class performance percentage"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  unit="%"
                />
                <Tooltip
                  formatter={(value) => [`${Number(value)}%`, "Group average"]}
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload?.label ?? "Class"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="averagePercentage"
                  name="Group average"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--primary)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

