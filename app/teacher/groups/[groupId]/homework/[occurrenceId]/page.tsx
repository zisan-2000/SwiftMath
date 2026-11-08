import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { reviewHomeworkAction } from "@/app/teacher/groups/[groupId]/homework/actions";
import { HomeworkPhotoViewer } from "@/components/homework/homework-photo-viewer";
import { HomeworkReviewForm } from "@/components/homework/homework-review-form";
import { HomeworkTimingSummary } from "@/components/homework/homework-timing-summary";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { formatDhakaDateTime } from "@/lib/homework-schedule";
import { getTeacherOccurrence } from "@/server/homework";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";

export const metadata: Metadata = { title: "Homework record" };

export default async function HomeworkOccurrencePage({ params, searchParams }: { params: Promise<{ groupId: string; occurrenceId: string }>; searchParams: Promise<{ error?: string; success?: string; q?: string; status?: string; timing?: string; academicLevel?: string }> }) {
  const { groupId, occurrenceId } = await params;
  const [{ teacher, institute, group }, query] = await Promise.all([loadTeacherGroupPageContext(groupId), searchParams]);
  const occurrence = await getTeacherOccurrence(teacher, occurrenceId);
  if (!occurrence || occurrence.schedule.originGroupId !== groupId) notFound();
  const now = new Date();
  const statusFor = (expectation: (typeof occurrence.expectations)[number]) => {
    const latest = expectation.submissions[0];
    return latest
      ? latest.status === HomeworkSubmissionStatus.IN_PROGRESS && occurrence.dueAt < now ? "INCOMPLETE" : latest.status
      : occurrence.opensAt > now ? "UPCOMING" : occurrence.dueAt < now ? "MISSING" : "NOT STARTED";
  };
  const nameQuery = query.q?.trim().toLowerCase() ?? "";
  const academicLevels = [...new Set(occurrence.expectations.map((row) => row.academicLevelNameSnapshot).filter((name): name is string => Boolean(name)))].sort();
  const expectations = occurrence.expectations.filter((row) => {
    const latest = row.submissions[0];
    if (nameQuery && !row.student.name.toLowerCase().includes(nameQuery) && !row.submissions.some((attempt) => attempt.pageNumber.toLowerCase().includes(nameQuery))) return false;
    if (query.status && statusFor(row) !== query.status) return false;
    if (query.academicLevel && row.academicLevelNameSnapshot !== query.academicLevel) return false;
    if (query.timing === "late" && !latest?.isLate) return false;
    if (query.timing === "on-time" && (!latest?.submittedAt || latest.isLate)) return false;
    return true;
  });

  return (
    <TeacherGroupShell user={teacher} institute={institute} groupId={groupId} groupName={group.name} title={occurrence.schedule.title} subtitle={`${formatDhakaDateTime(occurrence.opensAt)} — due ${formatDhakaDateTime(occurrence.dueAt)}`} backHref={`/teacher/groups/${groupId}/homework`} backLabel="Back to homework">
      {(query.error || query.success) && <p className={`mb-5 rounded-md border px-4 py-3 text-sm ${query.error ? "text-destructive" : "text-success"}`}>{query.error ?? query.success}</p>}
      <Card className="mb-5"><CardContent className="pt-6"><form method="get" className="grid gap-3 sm:grid-cols-4"><div className="space-y-1"><Label htmlFor="q">Student or page</Label><Input id="q" name="q" defaultValue={query.q} placeholder="Name or page" /></div><div className="space-y-1"><Label htmlFor="academicLevel">Academic Level</Label><select id="academicLevel" name="academicLevel" defaultValue={query.academicLevel ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All</option>{academicLevels.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div className="space-y-1"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={query.status ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All</option>{["MISSING", "INCOMPLETE", "SUBMITTED", "APPROVED", "REJECTED", "RESUBMISSION_REQUESTED"].map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className="space-y-1"><Label htmlFor="timing">Timing</Label><select id="timing" name="timing" defaultValue={query.timing ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">All</option><option value="on-time">On time</option><option value="late">Late</option></select></div><div className="flex gap-2 sm:col-span-4"><Button type="submit" variant="outline">Filter</Button><Button asChild variant="ghost"><Link href={`/teacher/groups/${groupId}/homework/${occurrenceId}`}>Clear</Link></Button></div></form></CardContent></Card>
      <div className="grid gap-5">
        {expectations.map((expectation) => {
          const latest = expectation.submissions[0];
          const displayStatus = statusFor(expectation);
          return <Card key={expectation.id}>
            <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">{expectation.student.name}</CardTitle><p className="text-sm text-muted-foreground">{expectation.academicLevelNameSnapshot ?? "Academic Level was unassigned"}</p></div><Badge variant={latest?.status === HomeworkSubmissionStatus.APPROVED ? "default" : "muted"}>{displayStatus}</Badge></div></CardHeader>
            <CardContent>
              {!latest ? <p className="text-sm text-muted-foreground">No submission yet.</p> : <div className="grid gap-4">
                <div className="flex flex-wrap gap-4 text-sm"><span>Attempt {latest.attemptNumber}</span><span>Page {latest.pageNumber}</span>{latest.isLate && <Badge variant="destructive">Late</Badge>}{latest.isOverTimeLimit && <Badge variant="outline">Over timer</Badge>}</div>
                <HomeworkTimingSummary startedAt={latest.startedAt} submittedAt={latest.submittedAt} completionSeconds={latest.completionSeconds} />
                <div className="flex flex-wrap gap-3"><HomeworkPhotoViewer submissionId={latest.id} kind="first" label="First photo" studentName={expectation.student.name} />{latest.finalPhotoKey && <HomeworkPhotoViewer submissionId={latest.id} kind="final" label="Final photo" studentName={expectation.student.name} />}</div>
                {latest.status !== HomeworkSubmissionStatus.IN_PROGRESS && <HomeworkReviewForm action={reviewHomeworkAction} hiddenFields={{ groupId, occurrenceId, submissionId: latest.id, expectedUpdatedAt: latest.updatedAt.toISOString() }} maxScore={occurrence.maxScoreSnapshot.toString()} initialScore={latest.score?.toString() ?? ""} initialComment={latest.teacherComment ?? ""} />}
                {expectation.submissions.length > 1 && <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">All attempts ({expectation.submissions.length})</summary><div className="mt-3 grid gap-4">{expectation.submissions.map((attempt) => <div key={attempt.id} className="grid gap-3 border-t pt-3 text-sm"><div className="flex flex-wrap items-center gap-3"><span>Attempt {attempt.attemptNumber}</span><span>Page {attempt.pageNumber}</span><Badge variant="muted">{attempt.status}</Badge></div><HomeworkTimingSummary startedAt={attempt.startedAt} submittedAt={attempt.submittedAt} completionSeconds={attempt.completionSeconds} /><div className="flex flex-wrap gap-2"><HomeworkPhotoViewer submissionId={attempt.id} kind="first" label="First photo" studentName={expectation.student.name} />{attempt.finalPhotoKey && <HomeworkPhotoViewer submissionId={attempt.id} kind="final" label="Final photo" studentName={expectation.student.name} />}</div></div>)}</div></details>}
              </div>}
            </CardContent>
          </Card>;
        })}
        {expectations.length === 0 && <p className="text-sm text-muted-foreground">{occurrence.expectations.length === 0 ? "The roster will be frozen when this homework opens." : "No students match these filters."}</p>}
      </div>
    </TeacherGroupShell>
  );
}
