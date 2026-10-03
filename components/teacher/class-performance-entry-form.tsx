"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Save, UserX } from "lucide-react";
import { toast } from "sonner";

import { ClassPerformanceStatus } from "@/lib/generated/prisma/enums";
import {
  CLASS_PERFORMANCE_NOT_ENTERED,
  type ClassPerformanceDraftStatus,
} from "@/lib/class-performance";
import {
  saveClassPerformanceAction,
  type SaveClassPerformanceState,
} from "@/app/teacher/groups/[groupId]/performance/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudentDraft {
  id: string;
  name: string;
  mark: string;
  status: ClassPerformanceDraftStatus;
  canBeNotEntered: boolean;
}

const INITIAL_ACTION_STATE: SaveClassPerformanceState = {};
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ClassPerformanceEntryForm({
  groupId,
  selectedDate,
  maximumMark: initialMaximumMark,
  students: initialStudents,
  isExisting,
}: {
  groupId: string;
  selectedDate: string;
  maximumMark: string;
  students: StudentDraft[];
  isExisting: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveClassPerformanceAction,
    INITIAL_ACTION_STATE,
  );
  const [maximumMark, setMaximumMark] = useState(initialMaximumMark);
  const [students, setStudents] = useState(initialStudents);
  const [sameMark, setSameMark] = useState("");

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      router.replace(
        `/teacher/groups/${groupId}/performance?date=${state.savedDate}`,
      );
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [groupId, router, state]);

  function updateStudent(id: string, patch: Partial<StudentDraft>) {
    setStudents((current) =>
      current.map((student) =>
        student.id === id ? { ...student, ...patch } : student,
      ),
    );
  }

  function applySameMark() {
    if (!sameMark.trim()) return;
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        mark: sameMark,
        status: ClassPerformanceStatus.PRESENT,
      })),
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">
          {isExisting ? "Edit class performance" : "Record class performance"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          One date creates one permanent group record. Absent students are saved
          with zero marks. Not entered students are excluded from ranking.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="groupId" value={groupId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="class-performance-date">Class date</Label>
              <Input
                id="class-performance-date"
                name="classDate"
                type="date"
                defaultValue={selectedDate}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-performance-maximum">Maximum mark</Label>
              <Input
                id="class-performance-maximum"
                name="maximumMark"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="999999.99"
                step="0.01"
                value={maximumMark}
                onChange={(event) => setMaximumMark(event.target.value)}
                required
              />
            </div>
          </div>

          {students.length > 0 ? (
            <>
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="class-performance-same-mark">
                    Give everyone the same mark
                  </Label>
                  <Input
                    id="class-performance-same-mark"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={maximumMark || undefined}
                    step="0.01"
                    value={sameMark}
                    onChange={(event) => setSameMark(event.target.value)}
                    placeholder={`Out of ${maximumMark || "maximum"}`}
                  />
                </div>
                <Button type="button" variant="outline" onClick={applySameMark}>
                  <Copy className="h-4 w-4" />
                  Apply to all
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Mark</th>
                      <th className="px-4 py-3 font-medium">Out of</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const absent =
                        student.status === ClassPerformanceStatus.ABSENT;
                      const notEntered =
                        student.status === CLASS_PERFORMANCE_NOT_ENTERED;
                      const markDisabled = absent || notEntered;
                      return (
                        <tr
                          key={student.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            <input type="hidden" name="studentId" value={student.id} />
                            {student.name}
                          </td>
                          <td className="w-40 px-4 py-3">
                            <Input
                              aria-label={`${student.name} mark`}
                              name={`mark:${student.id}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={maximumMark || undefined}
                              step="0.01"
                              value={absent ? "0" : student.mark}
                              disabled={markDisabled}
                              onChange={(event) =>
                                updateStudent(student.id, {
                                  mark: event.target.value,
                                })
                              }
                              required={!markDisabled}
                            />
                            {markDisabled ? (
                              <input
                                type="hidden"
                                name={`mark:${student.id}`}
                                value={absent ? "0" : ""}
                              />
                            ) : null}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">
                            / {maximumMark || "—"}
                          </td>
                          <td className="w-44 px-4 py-3">
                            <select
                              aria-label={`${student.name} attendance status`}
                              name={`status:${student.id}`}
                              className={SELECT_CLASS}
                              value={student.status}
                              onChange={(event) => {
                                const status = event.target
                                  .value as ClassPerformanceDraftStatus;
                                updateStudent(student.id, {
                                  status,
                                  ...(status === ClassPerformanceStatus.ABSENT
                                    ? { mark: "0" }
                                    : status === CLASS_PERFORMANCE_NOT_ENTERED
                                      ? { mark: "" }
                                      : student.mark
                                        ? {}
                                        : { mark: "0" }
                                  ),
                                });
                              }}
                            >
                              <option value={ClassPerformanceStatus.PRESENT}>
                                Present
                              </option>
                              <option value={ClassPerformanceStatus.ABSENT}>
                                Absent
                              </option>
                              {student.canBeNotEntered ? (
                                <option value={CLASS_PERFORMANCE_NOT_ENTERED}>
                                  Not entered
                                </option>
                              ) : null}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Add students to this group before recording performance.
            </div>
          )}

          {state.message ? (
            <FormMessage variant={state.ok ? "success" : "error"}>
              {state.message}
            </FormMessage>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || students.length === 0}>
              {pending ? (
                "Saving…"
              ) : isExisting ? (
                <>
                  <Save className="h-4 w-4" /> Update record
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save record
                </>
              )}
            </Button>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserX className="h-3.5 w-3.5" /> Absent counts as 0 in ranking.
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
