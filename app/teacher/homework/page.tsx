import type { Metadata } from "next";
import Link from "next/link";

import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listTeacherGroups } from "@/server/teacher";
import { loadTeacherPageContext } from "@/server/teacher-page";

export const metadata: Metadata = { title: "Homework" };

export default async function TeacherHomeworkIndexPage() {
  const { teacher, institute } = await loadTeacherPageContext();
  const groups = await listTeacherGroups(teacher.id);
  return <TeacherPageShell user={teacher} institute={institute} title="Homework" subtitle="Choose a group to create schedules and review submissions." actions={<Button asChild variant="outline"><Link href="/teacher/homework/history">Global history</Link></Button>}>
    <div className="grid gap-4 sm:grid-cols-2">{groups.map((group) => <Card key={group.id}><CardContent className="flex items-center justify-between gap-4 pt-6"><div><p className="font-semibold">{group.name}</p><p className="text-sm text-muted-foreground">{group._count.students} students</p></div><Button asChild variant="outline"><Link href={`/teacher/groups/${group.id}/homework`}>Open homework</Link></Button></CardContent></Card>)}</div>
    {groups.length === 0 && <p className="text-sm text-muted-foreground">Create a group first.</p>}
  </TeacherPageShell>;
}
