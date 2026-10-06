import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { reviewHomeworkAction } from "@/app/teacher/groups/[groupId]/homework/actions";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { formatDhakaDateTime } from "@/lib/homework-schedule";
import { getTeacherOccurrence } from "@/server/homework";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";

export const metadata: Metadata = { title: "Homework record" };

export default async function HomeworkOccurrencePage({ params, searchParams }: { params: Promise<{ groupId: string; occurrenceId: string }>; searchParams: Promise<{ error?: string; success?: string; q?: string; status?: string; timing?: string; academicLevel?: string }> }) {
  const { groupId, occurrenceId } = await params;
  const [{ teacher, institute, group }, query] = await Promise.all([loadTeacherGroupPageContext(groupId), searchParams]);
  const occurrence = await getTeacherOccurrence(teacher, occurrenceId);
  if (!occurrence) notFound();
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
                <div className="flex flex-wrap gap-4 text-sm"><span>Attempt {latest.attemptNumber}</span><span>Page {latest.pageNumber}</span>{latest.completionSeconds != null && <span>{Math.ceil(latest.completionSeconds / 60)} min</span>}{latest.isLate && <Badge variant="destructive">Late</Badge>}{latest.isOverTimeLimit && <Badge variant="outline">Over timer</Badge>}</div>
                <div className="flex gap-3"><Button asChild size="sm" variant="outline"><Link target="_blank" href={`/api/homework/photos/${latest.id}/first`}>First photo</Link></Button>{latest.finalPhotoKey && <Button asChild size="sm" variant="outline"><Link target="_blank" href={`/api/homework/photos/${latest.id}/final`}>Final photo</Link></Button>}</div>
                {latest.status !== HomeworkSubmissionStatus.IN_PROGRESS && <form action={reviewHomeworkAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                  <input type="hidden" name="groupId" value={groupId} /><input type="hidden" name="occurrenceId" value={occurrenceId} /><input type="hidden" name="submissionId" value={latest.id} />
                  <div className="space-y-2"><Label htmlFor={`score-${latest.id}`}>Score / {occurrence.maxScoreSnapshot.toString()}</Label><Input id={`score-${latest.id}`} name="score" type="number" min="0" max={occurrence.maxScoreSnapshot.toString()} step="0.01" defaultValue={latest.score?.toString() ?? ""} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor={`comment-${latest.id}`}>Comment</Label><Textarea id={`comment-${latest.id}`} name="comment" defaultValue={latest.teacherComment ?? ""} /></div>
                  <div className="flex flex-wrap gap-2 sm:col-span-3"><Button name="status" value={HomeworkSubmissionStatus.APPROVED}>Approve</Button><Button name="status" value={HomeworkSubmissionStatus.RESUBMISSION_REQUESTED} variant="outline">Request resubmission</Button><Button name="status" value={HomeworkSubmissionStatus.REJECTED} variant="destructive">Reject</Button></div>
                </form>}
                {expectation.submissions.length > 1 && <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">All attempts ({expectation.submissions.length})</summary><div className="mt-3 grid gap-3">{expectation.submissions.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm"><span>Attempt {attempt.attemptNumber}</span><span>Page {attempt.pageNumber}</span><Badge variant="muted">{attempt.status}</Badge><Link className="text-primary underline" target="_blank" href={`/api/homework/photos/${attempt.id}/first`}>First photo</Link>{attempt.finalPhotoKey && <Link className="text-primary underline" target="_blank" href={`/api/homework/photos/${attempt.id}/final`}>Final photo</Link>}</div>)}</div></details>}
              </div>}
            </CardContent>
          </Card>;
        })}
        {expectations.length === 0 && <p className="text-sm text-muted-foreground">{occurrence.expectations.length === 0 ? "The roster will be frozen when this homework opens." : "No students match these filters."}</p>}
      </div>
    </TeacherGroupShell>
  );
}
