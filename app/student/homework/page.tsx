import type { Metadata } from "next";

import { finishHomeworkAction, startHomeworkAction } from "@/app/student/homework/actions";
import { StudentPageShell } from "@/components/student/student-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HomeworkLiveTimer } from "@/components/student/homework-live-timer";
import { HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { formatDhakaDateTime } from "@/lib/homework-schedule";
import { buildHomeworkPageSuggestions, elapsedSecondsSince } from "@/lib/homework-presentation";
import { getStudentHomework } from "@/server/homework";
import { loadStudentPageContext } from "@/server/student-page";

export const metadata: Metadata = { title: "Homework" };

export default async function StudentHomeworkPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; q?: string; from?: string; to?: string; status?: string; timing?: string; academicLevel?: string }> }) {
  const [{ student, institute }, query] = await Promise.all([loadStudentPageContext(), searchParams]);
  const rows = await getStudentHomework(student.id, student.instituteId);
  const now = new Date();
  const pageQuery = query.q?.trim().toLowerCase() ?? "";
  const from = query.from ? new Date(`${query.from}T00:00:00+06:00`) : null;
  const to = query.to ? new Date(`${query.to}T23:59:59+06:00`) : null;
  const statusFor = (row: (typeof rows)[number]) => {
    const latest = row.submissions[0];
    return latest
      ? latest.status === HomeworkSubmissionStatus.IN_PROGRESS && row.occurrence.dueAt < now ? "INCOMPLETE" : latest.status
      : row.occurrence.opensAt > now ? "UPCOMING" : row.occurrence.dueAt < now ? "MISSING" : "NOT STARTED";
  };
  const filteredRows = rows.filter((row) => {
    const latest = row.submissions[0];
    if (from && row.occurrence.opensAt < from) return false;
    if (to && row.occurrence.opensAt > to) return false;
    if (query.academicLevel && row.academicLevelNameSnapshot !== query.academicLevel) return false;
    if (query.status && statusFor(row) !== query.status) return false;
    if (query.timing === "late" && !latest?.isLate) return false;
    if (query.timing === "on-time" && (!latest?.submittedAt || latest.isLate)) return false;
    if (pageQuery && !row.submissions.some((attempt) => attempt.pageNumber.toLowerCase().includes(pageQuery))) return false;
    return true;
  });
  const academicLevels = [...new Set(rows.map((row) => row.academicLevelNameSnapshot).filter((name): name is string => Boolean(name)))].sort();
  const pageSuggestions = buildHomeworkPageSuggestions(
    rows.flatMap((row) => row.submissions.map((attempt) => attempt.pageNumber)),
  );

  return <StudentPageShell user={student} institute={institute} title="Homework" subtitle="Your date-wise homework, uploads, results, and history.">
    {(query.error || query.success) && <p className={`mb-5 rounded-md border px-4 py-3 text-sm ${query.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}>{query.error ?? query.success}</p>}
    <datalist id="homework-page-suggestions">{pageSuggestions.map((page) => <option key={page} value={page} />)}</datalist>
    <Card className="mb-5"><CardContent className="pt-6"><form method="get" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><div className="space-y-1"><Label htmlFor="q">Page</Label><Input id="q" name="q" defaultValue={query.q} placeholder="77" /></div><div className="space-y-1"><Label htmlFor="from">From</Label><Input id="from" name="from" type="date" defaultValue={query.from} /></div><div className="space-y-1"><Label htmlFor="to">To</Label><Input id="to" name="to" type="date" defaultValue={query.to} /></div><div className="space-y-1"><Label htmlFor="academicLevel">Academic Level</Label><select id="academicLevel" name="academicLevel" defaultValue={query.academicLevel ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All</option>{academicLevels.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div className="space-y-1"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={query.status ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All</option>{["MISSING", "INCOMPLETE", "SUBMITTED", "APPROVED", "REJECTED", "RESUBMISSION_REQUESTED"].map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className="space-y-1"><Label htmlFor="timing">Timing</Label><select id="timing" name="timing" defaultValue={query.timing ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All</option><option value="on-time">On time</option><option value="late">Late</option></select></div><div className="flex gap-2 sm:col-span-3 lg:col-span-6"><Button type="submit" variant="outline">Filter history</Button><Button asChild variant="ghost"><a href="/student/homework">Clear</a></Button></div></form></CardContent></Card>
    <div className="grid gap-5">
      {filteredRows.map((row) => {
        const latest = row.submissions[0];
        const canStart = row.occurrence.opensAt <= now && (!latest || latest.status === HomeworkSubmissionStatus.RESUBMISSION_REQUESTED);
        const displayStatus = statusFor(row);
        return <Card key={row.id}>
          <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{row.occurrence.schedule.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Academic Level: {row.academicLevelNameSnapshot ?? "Unassigned"} · Opens {formatDhakaDateTime(row.occurrence.opensAt)} · Due {formatDhakaDateTime(row.occurrence.dueAt)}</p></div><Badge variant={latest?.status === HomeworkSubmissionStatus.APPROVED ? "default" : "muted"}>{displayStatus}</Badge></div></CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm">Maximum score: {row.occurrence.maxScoreSnapshot.toString()} · Timer: {row.occurrence.timeLimitMinutesSnapshot} minutes{row.occurrence.showTimerSnapshot ? " (visible)" : ""}</p>
            {latest?.status === HomeworkSubmissionStatus.IN_PROGRESS && <form action={finishHomeworkAction} className="grid gap-3 rounded-lg border p-4"><input type="hidden" name="submissionId" value={latest.id} /><p className="text-sm font-medium">Attempt {latest.attemptNumber}, page {latest.pageNumber} is running.</p>{row.occurrence.showTimerSnapshot && <HomeworkLiveTimer key={latest.id} startedAt={latest.startedAt.toISOString()} initialElapsedSeconds={elapsedSecondsSince(latest.startedAt, now)} />}<div className="space-y-2"><Label htmlFor={`final-${latest.id}`}>Final photo</Label><Input id={`final-${latest.id}`} name="finalPhoto" type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" required /></div><Button type="submit" className="w-fit">Upload final photo & submit</Button></form>}
            {canStart && <form action={startHomeworkAction} className="grid gap-3 rounded-lg border p-4"><input type="hidden" name="expectationId" value={row.id} /><div className="space-y-2"><Label htmlFor={`page-${row.id}`}>Page number</Label><Input id={`page-${row.id}`} name="pageNumber" list="homework-page-suggestions" maxLength={80} placeholder="Type or select a previous page" autoComplete="off" required /><p className="text-xs text-muted-foreground">Type any page, or choose from your previous page history.</p></div><div className="space-y-2"><Label htmlFor={`first-${row.id}`}>First photo (starts timer)</Label><Input id={`first-${row.id}`} name="firstPhoto" type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" required /></div><Button type="submit" className="w-fit">Upload first photo & start</Button></form>}
            {latest && latest.status !== HomeworkSubmissionStatus.IN_PROGRESS && <div className="text-sm text-muted-foreground"><p>Attempt {latest.attemptNumber} · Page {latest.pageNumber}{latest.isLate ? " · Late" : ""}{latest.isOverTimeLimit ? " · Over timer" : ""}</p>{latest.score != null && <p className="mt-1 text-foreground">Score: {latest.score.toString()} / {row.occurrence.maxScoreSnapshot.toString()}</p>}{latest.teacherComment && <p className="mt-1">Teacher: {latest.teacherComment}</p>}<div className="mt-2 flex gap-3"><a className="text-primary underline" target="_blank" href={`/api/homework/photos/${latest.id}/first`}>First photo</a>{latest.submittedAt && <a className="text-primary underline" target="_blank" href={`/api/homework/photos/${latest.id}/final`}>Final photo</a>}</div></div>}
            {row.submissions.length > 1 && <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Attempt history ({row.submissions.length})</summary><div className="mt-3 grid gap-2">{row.submissions.map((attempt) => <p key={attempt.id} className="border-t pt-2 text-sm">Attempt {attempt.attemptNumber} · Page {attempt.pageNumber} · {attempt.status}{attempt.score != null ? ` · ${attempt.score.toString()}/${row.occurrence.maxScoreSnapshot.toString()}` : ""}</p>)}</div></details>}
          </CardContent>
        </Card>;
      })}
      {filteredRows.length === 0 && <p className="text-sm text-muted-foreground">{rows.length === 0 ? "No homework has been assigned yet." : "No homework matches these filters."}</p>}
    </div>
  </StudentPageShell>;
}
