import type { Metadata } from "next";

import { createAcademicLevelAction, updateAcademicLevelAction } from "@/app/admin/academic-levels/actions";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadAdminPageContext } from "@/server/admin-page";
import { listAcademicLevels } from "@/server/academic-levels";

export const metadata: Metadata = { title: "Academic Levels" };

export default async function AcademicLevelsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { admin, institute } = await loadAdminPageContext();
  const [levels, query] = await Promise.all([listAcademicLevels(admin.instituteId, true), searchParams]);

  return (
    <AdminPageShell user={admin} institute={institute} title="Academic Levels" subtitle="Teacher-controlled main levels, independent from Practice/Exam levels.">
      <BackLink href="/admin">Admin dashboard</BackLink>
      {(query.error || query.success) && (
        <p className={`mt-5 rounded-md border px-4 py-3 text-sm ${query.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}>
          {query.error ?? query.success}
        </p>
      )}
      <Card className="mt-6">
        <CardHeader><CardTitle>Add academic level</CardTitle></CardHeader>
        <CardContent>
          <form action={createAcademicLevelAction} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required placeholder="Academic Level 1" /></div>
            <div className="space-y-2"><Label htmlFor="orderIndex">Order</Label><Input id="orderIndex" name="orderIndex" required type="number" min="1" defaultValue={levels.length + 1} /></div>
            <Button type="submit">Add level</Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-4">
        {levels.map((level) => (
          <Card key={level.id}>
            <CardContent className="pt-6">
              <form action={updateAcademicLevelAction} className="grid gap-4 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end">
                <input type="hidden" name="levelId" value={level.id} />
                <div className="space-y-2"><Label htmlFor={`name-${level.id}`}>Name</Label><Input id={`name-${level.id}`} name="name" required defaultValue={level.name} /></div>
                <div className="space-y-2"><Label htmlFor={`order-${level.id}`}>Order</Label><Input id={`order-${level.id}`} name="orderIndex" type="number" min="1" required defaultValue={level.orderIndex} /></div>
                <label className="flex h-10 items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={level.isActive} /> Active</label>
                <Button type="submit" variant="outline">Save</Button>
              </form>
              <p className="mt-3 text-sm text-muted-foreground">{level._count.students} student{level._count.students === 1 ? "" : "s"}</p>
            </CardContent>
          </Card>
        ))}
        {levels.length === 0 && <p className="text-sm text-muted-foreground">No academic levels yet.</p>}
      </div>
    </AdminPageShell>
  );
}
