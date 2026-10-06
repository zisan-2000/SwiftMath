import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createHomeworkAction, setHomeworkScheduleStatusAction } from "@/app/teacher/groups/[groupId]/homework/actions";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HomeworkModeFields } from "@/components/teacher/homework-mode-fields";
import { HomeworkScheduleMode, HomeworkScheduleStatus, HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { formatDhakaDateTime } from "@/lib/homework-schedule";
import { getTeacherHomeworkWorkspace } from "@/server/homework";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";

export const metadata: Metadata = { title: "Homework" };
const SELECT_CLASS = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function TeacherHomeworkPage({ params, searchParams }: { params: Promise<{ groupId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { groupId } = await params;
  const [{ teacher, institute, group }, query] = await Promise.all([loadTeacherGroupPageContext(groupId), searchParams]);
  const workspace = await getTeacherHomeworkWorkspace(teacher, groupId);
  if (!workspace) notFound();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

  return (
    <TeacherGroupShell user={teacher} institute={institute} groupId={groupId} groupName={group.name} subtitle="Schedule, monitor, and review photo-based homework.">
      {(query.error || query.success) && <p className={`mb-5 rounded-md border px-4 py-3 text-sm ${query.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}>{query.error ?? query.success}</p>}
      <Card>
        <CardHeader><CardTitle>Create homework schedule</CardTitle><p className="text-sm text-muted-foreground">Use Bangladesh time. Weekly homework repeats automatically; manual homework creates one date-wise record.</p></CardHeader>
        <CardContent>
          <form action={createHomeworkAction} className="grid gap-5">
            <input type="hidden" name="groupId" value={groupId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" required placeholder="Weekly handwriting practice" /></div>
              <div className="space-y-2"><Label htmlFor="target">Target</Label><select id="target" name="targetStudentId" className={SELECT_CLASS}><option value="">Entire group</option>{workspace.group.students.map((student) => <option key={student.id} value={student.id}>{student.name} — {student.academicLevel?.name ?? "Academic Level unassigned"}</option>)}</select></div>
              <HomeworkModeFields today={today} />
              <div className="space-y-2"><Label htmlFor="maxScore">Maximum score</Label><Input id="maxScore" name="maxScore" type="number" min="0.01" step="0.01" defaultValue="10" required /></div>
              <div className="space-y-2"><Label htmlFor="timeLimitMinutes">Timer limit (minutes)</Label><Input id="timeLimitMinutes" name="timeLimitMinutes" type="number" min="1" max="1440" defaultValue="30" required /></div>
            </div>
            <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showTimer" defaultChecked /> Show timer to student</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowSamePageAgain" /> Allow same page again</label></div>
            <Button type="submit" className="w-fit">Create schedule</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-5">
        {workspace.schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>{schedule.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{schedule.targetType === "GROUP" ? "Entire group" : schedule.student?.name} · {schedule.mode === HomeworkScheduleMode.WEEKLY_RECURRING ? "Weekly" : "Manual"} · {schedule.maxScore.toString()} marks · {schedule.timeLimitMinutes} min</p></div><Badge variant={schedule.status === HomeworkScheduleStatus.ACTIVE ? "default" : "muted"}>{schedule.status}</Badge></CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {schedule.occurrences.map((occurrence) => {
                  const submitted = occurrence.expectations.filter((item) => item.submissions[0] && item.submissions[0].status !== HomeworkSubmissionStatus.IN_PROGRESS).length;
                  return <div key={occurrence.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{formatDhakaDateTime(occurrence.opensAt)}</p><p className="text-sm text-muted-foreground">Due {formatDhakaDateTime(occurrence.dueAt)} · {submitted}/{occurrence._count.expectations} submitted{!occurrence.expectationsMaterializedAt ? " · roster pending until open" : ""}</p></div><Button asChild variant="outline" size="sm"><Link href={`/teacher/groups/${groupId}/homework/${occurrence.id}`}>Open record</Link></Button></div>;
                })}
                {schedule.occurrences.length === 0 && <p className="text-sm text-muted-foreground">No occurrences in the current 8-week window.</p>}
              </div>
              <div className="mt-4 flex gap-2"><form action={setHomeworkScheduleStatusAction}><input type="hidden" name="groupId" value={groupId} /><input type="hidden" name="scheduleId" value={schedule.id} /><input type="hidden" name="status" value={schedule.status === HomeworkScheduleStatus.ACTIVE ? HomeworkScheduleStatus.PAUSED : HomeworkScheduleStatus.ACTIVE} /><Button type="submit" variant="ghost" size="sm">{schedule.status === HomeworkScheduleStatus.ACTIVE ? "Pause" : "Activate"}</Button></form><form action={setHomeworkScheduleStatusAction}><input type="hidden" name="groupId" value={groupId} /><input type="hidden" name="scheduleId" value={schedule.id} /><input type="hidden" name="status" value={HomeworkScheduleStatus.ARCHIVED} /><Button type="submit" variant="ghost" size="sm" className="text-destructive">Archive</Button></form></div>
            </CardContent>
          </Card>
        ))}
        {workspace.schedules.length === 0 && <p className="text-sm text-muted-foreground">No homework schedules yet.</p>}
      </div>
    </TeacherGroupShell>
  );
}
