"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HomeworkScheduleMode } from "@/lib/generated/prisma/enums";

const SELECT_CLASS = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HomeworkModeFields({ today }: { today: string }) {
  const [mode, setMode] = useState<HomeworkScheduleMode>(HomeworkScheduleMode.WEEKLY_RECURRING);

  return <>
    <div className="space-y-2"><Label htmlFor="mode">Due mode</Label><select id="mode" name="mode" className={SELECT_CLASS} value={mode} onChange={(event) => setMode(event.target.value as HomeworkScheduleMode)}><option value={HomeworkScheduleMode.WEEKLY_RECURRING}>Weekly recurring</option><option value={HomeworkScheduleMode.MANUAL_SPECIFIC}>Manual / specific</option></select></div>
    {mode === HomeworkScheduleMode.WEEKLY_RECURRING ? <>
      <div className="space-y-2"><Label htmlFor="startDate">Start date</Label><Input id="startDate" name="startDate" type="date" defaultValue={today} required /></div>
      <div className="space-y-2"><Label htmlFor="endDate">End date (optional)</Label><Input id="endDate" name="endDate" type="date" /></div>
      <fieldset className="rounded-lg border p-4 sm:col-span-2"><legend className="px-1 text-sm font-medium">Weekly settings</legend><div className="flex flex-wrap gap-3">{DAYS.map((day, index) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" name="weekdays" value={index} defaultChecked={index === 5 || index === 6} />{day}</label>)}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="openTime">Available from</Label><Input id="openTime" name="openTime" type="time" defaultValue="18:00" required /></div><div className="space-y-2"><Label htmlFor="dueTime">Due time</Label><Input id="dueTime" name="dueTime" type="time" defaultValue="23:59" required /></div></div></fieldset>
    </> : <>
      <input type="hidden" name="startDate" value={today} />
      <fieldset className="rounded-lg border p-4 sm:col-span-2"><legend className="px-1 text-sm font-medium">Manual settings</legend><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="manualOpensAt">Available from</Label><Input id="manualOpensAt" name="manualOpensAt" type="datetime-local" required /></div><div className="space-y-2"><Label htmlFor="manualDueAt">Due at</Label><Input id="manualDueAt" name="manualDueAt" type="datetime-local" required /></div></div></fieldset>
    </>}
  </>;
}
