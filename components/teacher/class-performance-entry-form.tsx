"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
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
import {
  StudentSearch,
  useStudentSearch,
} from "@/components/ui/student-search";

interface StudentDraft {
  id: string;
  name: string;
  contactNumber?: string | null;
  mark: string;
  status: ClassPerformanceDraftStatus;
  canBeNotEntered: boolean;
}

const INITIAL_ACTION_STATE: SaveClassPerformanceState = {};
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface EntryFormProps {
  groupId: string;
  selectedDate: string;
  maximumMark: string;
  students: StudentDraft[];
  isExisting: boolean;
  sheetId: string | null;
  revision: number | null;
}

// Preserve drafts across same-tab Back/Forward navigation. A full-page exit is
// protected by beforeunload; no student marks are written to persistent storage.
const unsavedDrafts = new Map<
  string,
  { source: EntryFormProps; maximumMark: string; students: StudentDraft[] }
>();

function snapshotKey(props: EntryFormProps): string {
  return JSON.stringify([
    props.groupId,
    props.selectedDate,
    props.sheetId,
    props.revision,
    props.maximumMark,
    props.isExisting,
    props.students.map((student) => [
      student.id,
      student.name,
      student.contactNumber ?? null,
      student.mark,
      student.status,
      student.canBeNotEntered,
    ]),
  ]);
}

/** Keep an unsaved draft when a background refresh delivers a newer revision. */
export function ClassPerformanceEntryForm(props: EntryFormProps) {
  const router = useRouter();
  const draftKey = `${props.groupId}:${props.selectedDate}`;
  const [accepted, setAccepted] = useState(
    () => unsavedDrafts.get(draftKey)?.source ?? props,
  );
  const [dirty, setDirty] = useState(() => unsavedDrafts.has(draftKey));
  const [saving, setSaving] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const incomingKey = snapshotKey(props);
  const acceptedKey = snapshotKey(accepted);
  if (incomingKey !== acceptedKey && !dirty) setAccepted(props);
  const stale = incomingKey !== acceptedKey;
  const saved = useCallback(() => {
    unsavedDrafts.delete(draftKey);
    setDirty(false);
  }, [draftKey]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const guardLink = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest("a[href]")
      )
        return;
      if (
        saving ||
        !window.confirm("Discard unsaved class marks and leave this record?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        unsavedDrafts.delete(draftKey);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty, saving, draftKey]);

  return (
    <div className="min-w-0 max-w-full">
      {stale && dirty && (
        <div className="mb-4 space-y-2" role="alert">
          <FormMessage variant="error">
            A newer record is available. Your unsaved draft is preserved. Load
            the latest record before saving.
          </FormMessage>
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  "Discard your draft and load the latest saved marks?",
                )
              ) {
                unsavedDrafts.delete(draftKey);
                setAccepted(props);
                setDirty(false);
              }
            }}
          >
            Load latest record
          </Button>
        </div>
      )}
      <ClassPerformanceEditor
        key={acceptedKey}
        {...accepted}
        onDirtyChange={setDirty}
        onSaved={saved}
        onPendingChange={setSaving}
        blocked={navigating || stale}
        dirty={dirty}
        navigating={navigating}
        onDateChange={(date) => {
          if (!date || date === props.selectedDate || saving) return;
          if (
            dirty &&
            !window.confirm(
              "Discard unsaved marks and load the selected class date?",
            )
          )
            return;
          unsavedDrafts.delete(draftKey);
          startNavigation(() =>
            router.push(
              `/teacher/groups/${props.groupId}/performance?date=${date}`,
            ),
          );
        }}
        onReload={() => {
          if (
            dirty &&
            !window.confirm(
              "Discard your draft and reload the latest saved marks?",
            )
          )
            return;
          unsavedDrafts.delete(draftKey);
          setDirty(false);
          startNavigation(() => router.refresh());
        }}
      />
    </div>
  );
}

function ClassPerformanceEditor({
  groupId,
  selectedDate,
  maximumMark: initialMaximumMark,
  students: initialStudents,
  isExisting,
  sheetId,
  revision,
  onDirtyChange,
  onSaved,
  onPendingChange,
  onReload,
  blocked,
  onDateChange,
  dirty,
  navigating,
}: EntryFormProps & {
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
  onPendingChange: (pending: boolean) => void;
  onReload: () => void;
  blocked: boolean;
  onDateChange: (date: string) => void;
  dirty: boolean;
  navigating: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveClassPerformanceAction,
    INITIAL_ACTION_STATE,
  );
  const draftKey = `${groupId}:${selectedDate}`;
  const [maximumMark, setMaximumMark] = useState(
    () => unsavedDrafts.get(draftKey)?.maximumMark ?? initialMaximumMark,
  );
  const [students, setStudents] = useState(
    () => unsavedDrafts.get(draftKey)?.students ?? initialStudents,
  );
  const [sameMark, setSameMark] = useState("");
  const { query, setQuery, filteredStudents } = useStudentSearch(students);
  const visibleStudentIds = useMemo(
    () => new Set(filteredStudents.map((student) => student.id)),
    [filteredStudents],
  );

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  function preserveDraft(
    nextStudents: StudentDraft[],
    nextMaximum = maximumMark,
  ) {
    unsavedDrafts.set(draftKey, {
      source: {
        groupId,
        selectedDate,
        maximumMark: initialMaximumMark,
        students: initialStudents,
        isExisting,
        sheetId,
        revision,
      },
      maximumMark: nextMaximum,
      students: nextStudents,
    });
    onDirtyChange(true);
  }

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      onSaved();
      toast.success(state.message);
      router.replace(
        `/teacher/groups/${groupId}/performance?date=${state.savedDate}`,
      );
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [groupId, router, state, onSaved]);

  function updateStudent(id: string, patch: Partial<StudentDraft>) {
    const updated = students.map((student) =>
      student.id === id ? { ...student, ...patch } : student,
    );
    preserveDraft(updated);
    setStudents(updated);
  }

  function applySameMark() {
    if (!sameMark.trim()) return;
    const updated = students.map((student) => ({
      ...student,
      mark: sameMark,
      status: ClassPerformanceStatus.PRESENT,
    }));
    preserveDraft(updated);
    setStudents(updated);
  }

  return (
    <Card className="min-w-0 max-w-full">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">
          {isExisting ? "Edit class performance" : "Record class performance"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          One date creates one permanent group record. Absent students are saved
          with zero marks. Not entered students are excluded from ranking.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 pt-6">
        <form action={formAction} className="min-w-0 space-y-6">
          <input type="hidden" name="groupId" value={groupId} />
          {/* The picker navigates; only the loaded record's date is submitted. */}
          <input type="hidden" name="classDate" value={selectedDate} />
          <input
            type="hidden"
            name="mode"
            value={isExisting || state.ok ? "update" : "create"}
          />
          <input
            type="hidden"
            name="sheetId"
            value={state.ok ? state.sheetId : (sheetId ?? "")}
          />
          <input
            type="hidden"
            name="revision"
            value={state.ok ? state.revision : (revision ?? "")}
          />
          {/* Fieldset defaults to min-inline-size:min-content in browsers.
              Override it so the wide table scrolls inside the card, not the page. */}
          <fieldset
            disabled={pending || blocked}
            className="min-w-0 w-full space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="class-performance-date">Class date</Label>
                <Input
                  id="class-performance-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => onDateChange(event.target.value)}
                  className="min-w-0 max-w-full"
                  aria-describedby="class-performance-date-help"
                  required
                />
                <p
                  id="class-performance-date-help"
                  className="text-xs text-muted-foreground"
                >
                  Select a date to load its marks or start a new record.
                </p>
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
                  onChange={(event) => {
                    preserveDraft(students, event.target.value);
                    setMaximumMark(event.target.value);
                  }}
                  required
                />
              </div>
            </div>

            {navigating && (
              <p role="status" className="text-sm text-muted-foreground">
                Loading class record…
              </p>
            )}
            {dirty && (
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
            )}

            {students.length > 0 ? (
              <>
                <StudentSearch
                  id="class-performance-student-search"
                  query={query}
                  onQueryChange={setQuery}
                  resultCount={filteredStudents.length}
                  totalCount={students.length}
                />

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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applySameMark}
                  >
                    <Copy className="h-4 w-4" />
                    Apply to all
                  </Button>
                </div>

                <div
                  className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border"
                  role="region"
                  aria-label="Student marks"
                  tabIndex={0}
                >
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
                        if (!visibleStudentIds.has(student.id)) {
                          return (
                            <tr key={student.id} hidden>
                              <td>
                                <input
                                  type="hidden"
                                  name="studentId"
                                  value={student.id}
                                />
                                <input
                                  type="hidden"
                                  name={`mark:${student.id}`}
                                  value={absent ? "0" : student.mark}
                                />
                                <input
                                  type="hidden"
                                  name={`status:${student.id}`}
                                  value={student.status}
                                />
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr
                            key={student.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              <input
                                type="hidden"
                                name="studentId"
                                value={student.id}
                              />
                              {student.name}
                              {student.contactNumber ? (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {student.contactNumber}
                                </span>
                              ) : null}
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
                                          : { mark: "0" }),
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
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No students match “{query.trim()}”.
                          </td>
                        </tr>
                      ) : null}
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
              <div className="space-y-2">
                <FormMessage variant={state.ok ? "success" : "error"}>
                  {state.message}
                </FormMessage>
                {!state.ok && (
                  <Button type="button" variant="outline" onClick={onReload}>
                    Reload latest record
                  </Button>
                )}
              </div>
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
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
