import type { Metadata } from "next";
import Link from "next/link";

import { reviewHomeworkFromHistoryAction } from "@/app/teacher/homework/history/actions";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HomeworkSubmissionStatus, HomeworkTargetType } from "@/lib/generated/prisma/enums";
import { formatDhakaDateTime } from "@/lib/homework-schedule";
import { getTeacherGlobalHomeworkHistory } from "@/server/homework";
import { loadTeacherPageContext } from "@/server/teacher-page";

export const metadata: Metadata = { title: "Homework History" };

interface HistorySearchParams {
  error?: string;
  success?: string;
  from?: string;
  to?: string;
  studentId?: string;
  academicLevel?: string;
  page?: string;
  status?: string;
  timing?: string;
}

export default async function TeacherHomeworkHistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistorySearchParams>;
}) {
  const [{ teacher, institute }, query] = await Promise.all([loadTeacherPageContext(), searchParams]);
  const rows = await getTeacherGlobalHomeworkHistory(teacher);
  const now = new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00+06:00`) : null;
  const to = query.to ? new Date(`${query.to}T23:59:59.999+06:00`) : null;
  const pageQuery = query.page?.trim().toLocaleLowerCase() ?? "";

  const statusFor = (row: (typeof rows)[number]) => {
    const latest = row.submissions[0];
    if (!latest) {
      if (row.occurrence.opensAt > now) return "UPCOMING";
      return row.occurrence.dueAt < now ? "MISSING" : "NOT STARTED";
    }
    if (latest.status === HomeworkSubmissionStatus.IN_PROGRESS && row.occurrence.dueAt < now) {
      return "INCOMPLETE";
    }
    return latest.status;
  };

  const filteredRows = rows.filter((row) => {
    const latest = row.submissions[0];
    if (from && row.occurrence.opensAt < from) return false;
    if (to && row.occurrence.opensAt > to) return false;
    if (query.studentId && row.student.id !== query.studentId) return false;
    if (query.academicLevel && row.academicLevelNameSnapshot !== query.academicLevel) return false;
    if (query.status && statusFor(row) !== query.status) return false;
    if (query.timing === "late" && !latest?.isLate) return false;
    if (query.timing === "on-time" && (!latest?.submittedAt || latest.isLate)) return false;
    if (pageQuery && !row.submissions.some((attempt) => attempt.pageNumber.toLocaleLowerCase().includes(pageQuery))) return false;
    return true;
  });

  const students = [...new Map(rows.map((row) => [row.student.id, row.student])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
  const academicLevels = [...new Set(rows.map((row) => row.academicLevelNameSnapshot).filter((name): name is string => Boolean(name)))].sort();
  const returnQuery = new URLSearchParams(
    Object.entries(query).filter(([key, value]) => key !== "error" && key !== "success" && Boolean(value)) as Array<[string, string]>,
  ).toString();

  return (
    <TeacherPageShell
      user={teacher}
      institute={institute}
      title="Homework History"
      subtitle="Search and review every homework record originally assigned by you."
      actions={<Button asChild variant="outline"><Link href="/teacher/homework">Back to homework</Link></Button>}
    >
      {(query.error || query.success) && (
        <p className={`mb-5 rounded-md border px-4 py-3 text-sm ${query.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}>
          {query.error ?? query.success}
        </p>
      )}

      <Card className="mb-5">
        <CardContent className="pt-6">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1"><Label htmlFor="from">From</Label><Input id="from" name="from" type="date" defaultValue={query.from} /></div>
            <div className="space-y-1"><Label htmlFor="to">To</Label><Input id="to" name="to" type="date" defaultValue={query.to} /></div>
            <div className="space-y-1"><Label htmlFor="studentId">Student</Label><select id="studentId" name="studentId" defaultValue={query.studentId ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All students</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="academicLevel">Academic Level</Label><select id="academicLevel" name="academicLevel" defaultValue={query.academicLevel ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All levels</option>{academicLevels.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="page">Page number</Label><Input id="page" name="page" defaultValue={query.page} placeholder="Type full or partial page" /></div>
            <div className="space-y-1"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={query.status ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All statuses</option>{["MISSING", "INCOMPLETE", "SUBMITTED", "APPROVED", "REJECTED", "RESUBMISSION_REQUESTED", "IN_PROGRESS"].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="timing">Timing</Label><select id="timing" name="timing" defaultValue={query.timing ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">On time or late</option><option value="on-time">On time</option><option value="late">Late</option></select></div>
            <div className="flex items-end gap-2"><Button type="submit" variant="outline">Filter history</Button><Button asChild variant="ghost"><Link href="/teacher/homework/history">Clear</Link></Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        {filteredRows.map((row) => {
          const latest = row.submissions[0];
          const displayStatus = statusFor(row);
          const targetLabel = row.occurrence.schedule.targetType === HomeworkTargetType.GROUP
            ? `Group: ${row.occurrence.schedule.group?.name ?? "Historical group"}`
            : `Individual: ${row.occurrence.schedule.student?.name ?? row.student.name}`;

          return (
            <Card key={row.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{row.occurrence.schedule.title} · {row.student.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{targetLabel} · Academic Level: {row.academicLevelNameSnapshot ?? "Unassigned"}</p>
                    <p className="text-sm text-muted-foreground">Opens {formatDhakaDateTime(row.occurrence.opensAt)} · Due {formatDhakaDateTime(row.occurrence.dueAt)}</p>
                  </div>
                  <Badge variant={latest?.status === HomeworkSubmissionStatus.APPROVED ? "default" : "muted"}>{displayStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {!latest ? <p className="text-sm text-muted-foreground">No submission attempt.</p> : (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>Attempt {latest.attemptNumber}</span><span>Page {latest.pageNumber}</span>
                      {latest.completionSeconds != null && <span>{Math.ceil(latest.completionSeconds / 60)} min</span>}
                      {latest.isLate && <Badge variant="destructive">Late</Badge>}
                      {latest.isOverTimeLimit && <Badge variant="outline">Over timer</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild size="sm" variant="outline"><Link target="_blank" href={`/api/homework/photos/${latest.id}/first`}>First photo</Link></Button>
                      {latest.finalPhotoKey && <Button asChild size="sm" variant="outline"><Link target="_blank" href={`/api/homework/photos/${latest.id}/final`}>Final photo</Link></Button>}
                    </div>
                    {latest.status !== HomeworkSubmissionStatus.IN_PROGRESS && latest.finalPhotoKey && (
                      <form action={reviewHomeworkFromHistoryAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                        <input type="hidden" name="submissionId" value={latest.id} />
                        <input type="hidden" name="returnQuery" value={returnQuery} />
                        <div className="space-y-2"><Label htmlFor={`score-${latest.id}`}>Score / {row.occurrence.maxScoreSnapshot.toString()}</Label><Input id={`score-${latest.id}`} name="score" type="number" min="0" max={row.occurrence.maxScoreSnapshot.toString()} step="0.01" defaultValue={latest.score?.toString() ?? ""} /></div>
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor={`comment-${latest.id}`}>Comment</Label><Textarea id={`comment-${latest.id}`} name="comment" defaultValue={latest.teacherComment ?? ""} /></div>
                        <div className="flex flex-wrap gap-2 sm:col-span-3"><Button name="status" value={HomeworkSubmissionStatus.APPROVED}>Approve</Button><Button name="status" value={HomeworkSubmissionStatus.RESUBMISSION_REQUESTED} variant="outline">Request resubmission</Button><Button name="status" value={HomeworkSubmissionStatus.REJECTED} variant="destructive">Reject</Button></div>
                      </form>
                    )}
                    {row.submissions.length > 1 && (
                      <details className="rounded-lg border p-4">
                        <summary className="cursor-pointer text-sm font-medium">All attempts ({row.submissions.length})</summary>
                        <div className="mt-3 grid gap-3">{row.submissions.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm"><span>Attempt {attempt.attemptNumber}</span><span>Page {attempt.pageNumber}</span><Badge variant="muted">{attempt.status}</Badge><Link className="text-primary underline" target="_blank" href={`/api/homework/photos/${attempt.id}/first`}>First photo</Link>{attempt.finalPhotoKey && <Link className="text-primary underline" target="_blank" href={`/api/homework/photos/${attempt.id}/final`}>Final photo</Link>}</div>)}</div>
                      </details>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filteredRows.length === 0 && <p className="text-sm text-muted-foreground">{rows.length === 0 ? "No homework history yet." : "No homework matches these filters."}</p>}
      </div>
    </TeacherPageShell>
  );
}
