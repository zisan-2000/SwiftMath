import "server-only";

import {
  AuditAction,
  HomeworkScheduleMode,
  HomeworkScheduleStatus,
  HomeworkSubmissionStatus,
  HomeworkTargetType,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  HOMEWORK_HORIZON_DAYS,
  buildWeeklyOccurrenceWindows,
  dateOnlyInDhaka,
  homeworkTiming,
} from "@/lib/homework-schedule";
import { prisma } from "@/lib/prisma";
import { canAccessHomeworkPhoto } from "@/lib/homework-presentation";
import type { TeacherContext } from "@/server/teacher";
import { removeHomeworkPhoto, storeHomeworkPhoto } from "@/server/homework-photos";

export class HomeworkError extends Error {}

export interface CreateHomeworkScheduleInput {
  groupId: string;
  targetStudentId?: string | null;
  title: string;
  mode: HomeworkScheduleMode;
  startDate: Date;
  endDate?: Date | null;
  manualOpensAt?: Date | null;
  manualDueAt?: Date | null;
  slots: Array<{ dayOfWeek: number; openMinute: number; dueMinute: number }>;
  maxScore: number;
  timeLimitMinutes: number;
  showTimer: boolean;
  allowSamePageAgain: boolean;
}

function horizonDate(now = new Date()) {
  const date = dateOnlyInDhaka(now);
  date.setUTCDate(date.getUTCDate() + HOMEWORK_HORIZON_DAYS);
  return date;
}

function occurrenceData(schedule: {
  instituteId: string;
  maxScore: { toString(): string };
  timeLimitMinutes: number;
  showTimer: boolean;
  allowSamePageAgain: boolean;
}) {
  return {
    instituteId: schedule.instituteId,
    maxScoreSnapshot: schedule.maxScore.toString(),
    timeLimitMinutesSnapshot: schedule.timeLimitMinutes,
    showTimerSnapshot: schedule.showTimer,
    allowSamePageAgainSnapshot: schedule.allowSamePageAgain,
  };
}

export async function generateScheduleOccurrences(scheduleId: string, now = new Date()) {
  const schedule = await prisma.homeworkSchedule.findUnique({
    where: { id: scheduleId },
    include: { slots: true },
  });
  if (!schedule || schedule.status !== HomeworkScheduleStatus.ACTIVE) return 0;

  if (schedule.mode === HomeworkScheduleMode.MANUAL_SPECIFIC) {
    if (!schedule.manualOpensAt || !schedule.manualDueAt) return 0;
    await prisma.homeworkOccurrence.upsert({
      where: { scheduleId_opensAt: { scheduleId, opensAt: schedule.manualOpensAt } },
      create: {
        scheduleId,
        opensAt: schedule.manualOpensAt,
        dueAt: schedule.manualDueAt,
        ...occurrenceData(schedule),
      },
      update: {},
    });
    return 1;
  }

  const windows = buildWeeklyOccurrenceWindows({
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    slots: schedule.slots,
    fromDate: dateOnlyInDhaka(now),
    throughDate: horizonDate(now),
  });
  if (windows.length === 0) return 0;
  const result = await prisma.homeworkOccurrence.createMany({
    data: windows.map((window) => ({
      scheduleId,
      ...window,
      ...occurrenceData(schedule),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Freeze each opened occurrence's target roster exactly once. */
export async function materializeOpenHomeworkExpectations(
  instituteId?: string,
  now = new Date(),
) {
  const opened = await prisma.homeworkOccurrence.findMany({
    where: {
      ...(instituteId ? { instituteId } : {}),
      opensAt: { lte: now },
      cancelledAt: null,
      expectationsMaterializedAt: null,
      schedule: { status: HomeworkScheduleStatus.ACTIVE },
    },
    select: { id: true },
    take: 250,
  });

  let materialized = 0;
  for (const row of opened) {
    const didMaterialize = await prisma.$transaction(async (tx) => {
      const claimed = await tx.homeworkOccurrence.updateMany({
        where: { id: row.id, expectationsMaterializedAt: null },
        data: { expectationsMaterializedAt: now },
      });
      if (claimed.count === 0) return false;

      const occurrence = await tx.homeworkOccurrence.findUniqueOrThrow({
        where: { id: row.id },
        select: {
          instituteId: true,
          schedule: { select: { targetType: true, groupId: true, studentId: true } },
        },
      });
      const students = await tx.user.findMany({
        where: {
          instituteId: occurrence.instituteId,
          role: Role.STUDENT,
          isActive: true,
          ...(occurrence.schedule.targetType === HomeworkTargetType.GROUP
            ? { groupId: occurrence.schedule.groupId! }
            : { id: occurrence.schedule.studentId! }),
        },
        select: {
          id: true,
          academicLevelId: true,
          academicLevel: { select: { name: true } },
        },
      });
      if (students.length > 0) {
        await tx.homeworkExpectation.createMany({
          data: students.map((student) => ({
            instituteId: occurrence.instituteId,
            occurrenceId: row.id,
            studentId: student.id,
            academicLevelIdSnapshot: student.academicLevelId,
            academicLevelNameSnapshot: student.academicLevel?.name ?? null,
          })),
          skipDuplicates: true,
        });
      }
      return true;
    });
    if (didMaterialize) materialized += 1;
  }
  return materialized;
}

export async function maintainHomework(instituteId?: string, now = new Date()) {
  const schedules = await prisma.homeworkSchedule.findMany({
    where: { ...(instituteId ? { instituteId } : {}), status: HomeworkScheduleStatus.ACTIVE },
    select: { id: true },
  });
  let generated = 0;
  for (const schedule of schedules) generated += await generateScheduleOccurrences(schedule.id, now);
  const materialized = await materializeOpenHomeworkExpectations(instituteId, now);
  return { schedules: schedules.length, generated, materialized };
}

export async function createHomeworkSchedule(
  teacher: TeacherContext,
  input: CreateHomeworkScheduleInput,
) {
  const title = input.title.trim();
  if (!title) throw new HomeworkError("Homework title is required.");
  if (!(input.maxScore > 0) || input.maxScore > 999_999.99) throw new HomeworkError("Maximum score must be greater than 0.");
  if (!Number.isInteger(input.timeLimitMinutes) || input.timeLimitMinutes < 1 || input.timeLimitMinutes > 1440) {
    throw new HomeworkError("Time limit must be between 1 and 1440 minutes.");
  }
  if (input.endDate && input.endDate < input.startDate) throw new HomeworkError("End date cannot be before start date.");

  const group = await prisma.group.findFirst({
    where: { id: input.groupId, teacherId: teacher.id, instituteId: teacher.instituteId },
    select: { id: true, name: true },
  });
  if (!group) throw new HomeworkError("Group not found or not owned by you.");

  let targetStudent: { id: string; name: string } | null = null;
  if (input.targetStudentId) {
    targetStudent = await prisma.user.findFirst({
      where: { id: input.targetStudentId, groupId: group.id, role: Role.STUDENT, isActive: true },
      select: { id: true, name: true },
    });
    if (!targetStudent) throw new HomeworkError("Choose an active student from this group.");
  }

  if (input.mode === HomeworkScheduleMode.WEEKLY_RECURRING) {
    if (input.slots.length === 0) throw new HomeworkError("Choose at least one weekday.");
    if (new Set(input.slots.map((slot) => slot.dayOfWeek)).size !== input.slots.length) {
      throw new HomeworkError("Each weekday can only be selected once.");
    }
    for (const slot of input.slots) {
      if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6 || slot.openMinute < 0 || slot.dueMinute > 1439 || slot.dueMinute <= slot.openMinute) {
        throw new HomeworkError("Every weekly slot needs a valid same-day open and due time.");
      }
    }
  } else if (!input.manualOpensAt || !input.manualDueAt || input.manualDueAt <= input.manualOpensAt) {
    throw new HomeworkError("Choose a valid manual open and due date/time.");
  }

  const schedule = await prisma.$transaction(async (tx) => {
    const created = await tx.homeworkSchedule.create({
      data: {
        instituteId: teacher.instituteId,
        createdById: teacher.id,
        mode: input.mode,
        targetType: targetStudent ? HomeworkTargetType.STUDENT : HomeworkTargetType.GROUP,
        groupId: targetStudent ? null : group.id,
        studentId: targetStudent?.id ?? null,
        title,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        manualOpensAt: input.mode === HomeworkScheduleMode.MANUAL_SPECIFIC ? input.manualOpensAt : null,
        manualDueAt: input.mode === HomeworkScheduleMode.MANUAL_SPECIFIC ? input.manualDueAt : null,
        maxScore: input.maxScore,
        timeLimitMinutes: input.timeLimitMinutes,
        showTimer: input.showTimer,
        allowSamePageAgain: input.allowSamePageAgain,
        slots: input.mode === HomeworkScheduleMode.WEEKLY_RECURRING
          ? { create: input.slots }
          : undefined,
      },
    });
    await tx.auditLog.create({
      data: {
        instituteId: teacher.instituteId,
        actorUserId: teacher.id,
        actorRole: Role.TEACHER,
        action: AuditAction.HOMEWORK_SCHEDULE_CREATED,
        targetType: "HomeworkSchedule",
        targetId: created.id,
        summary: `Created ${title} homework for ${targetStudent?.name ?? group.name}.`,
        metadata: { mode: input.mode, groupId: group.id, studentId: targetStudent?.id ?? null },
      },
    });
    return created;
  });

  await generateScheduleOccurrences(schedule.id);
  await materializeOpenHomeworkExpectations(teacher.instituteId);
  return schedule;
}

export async function setHomeworkScheduleStatus(
  teacher: TeacherContext,
  scheduleId: string,
  status: HomeworkScheduleStatus,
) {
  const schedule = await prisma.homeworkSchedule.findFirst({
    where: {
      id: scheduleId,
      instituteId: teacher.instituteId,
      createdById: teacher.id,
    },
    select: { id: true },
  });
  if (!schedule) throw new HomeworkError("Homework schedule not found.");
  await prisma.$transaction(async (tx) => {
    await tx.homeworkSchedule.update({ where: { id: schedule.id }, data: { status } });
    await tx.auditLog.create({
      data: {
        instituteId: teacher.instituteId,
        actorUserId: teacher.id,
        actorRole: Role.TEACHER,
        action: AuditAction.HOMEWORK_SCHEDULE_UPDATED,
        targetType: "HomeworkSchedule",
        targetId: schedule.id,
        summary: `Changed homework schedule status to ${status}.`,
        metadata: { status },
      },
    });
  });
  if (status === HomeworkScheduleStatus.ACTIVE) {
    await generateScheduleOccurrences(schedule.id);
    await materializeOpenHomeworkExpectations(teacher.instituteId);
  }
}

export async function getTeacherHomeworkWorkspace(teacher: TeacherContext, groupId: string) {
  await maintainHomework(teacher.instituteId);
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherId: teacher.id, instituteId: teacher.instituteId },
    select: {
      id: true,
      name: true,
      students: {
        where: { role: Role.STUDENT, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, academicLevel: { select: { name: true } } },
      },
    },
  });
  if (!group) return null;
  const schedules = await prisma.homeworkSchedule.findMany({
    where: {
      instituteId: teacher.instituteId,
      OR: [
        { groupId, createdById: teacher.id },
        {
          targetType: HomeworkTargetType.STUDENT,
          createdById: teacher.id,
          student: { groupId },
        },
      ],
      status: { not: HomeworkScheduleStatus.ARCHIVED },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, mode: true, status: true, targetType: true,
      student: { select: { name: true } }, maxScore: true, timeLimitMinutes: true,
      slots: { orderBy: { dayOfWeek: "asc" } },
      occurrences: {
        orderBy: { opensAt: "desc" },
        select: {
          id: true, opensAt: true, dueAt: true, expectationsMaterializedAt: true,
          _count: { select: { expectations: true } },
          expectations: { select: { submissions: { orderBy: { attemptNumber: "desc" }, take: 1, select: { status: true } } } },
        },
      },
    },
  });
  return { group, schedules };
}

/**
 * Global history is scoped to the teacher who originally created the schedule.
 * It deliberately does not follow a student's current group/teacher relation.
 */
export async function getTeacherGlobalHomeworkHistory(teacher: TeacherContext) {
  await maintainHomework(teacher.instituteId);
  return prisma.homeworkExpectation.findMany({
    where: {
      instituteId: teacher.instituteId,
      occurrence: {
        cancelledAt: null,
        schedule: { createdById: teacher.id },
      },
    },
    orderBy: { occurrence: { opensAt: "desc" } },
    select: {
      id: true,
      academicLevelNameSnapshot: true,
      student: { select: { id: true, name: true } },
      occurrence: {
        select: {
          id: true,
          opensAt: true,
          dueAt: true,
          maxScoreSnapshot: true,
          timeLimitMinutesSnapshot: true,
          schedule: {
            select: {
              title: true,
              targetType: true,
              group: { select: { id: true, name: true } },
              student: { select: { id: true, name: true } },
            },
          },
        },
      },
      submissions: {
        orderBy: { attemptNumber: "desc" },
        select: {
          id: true,
          attemptNumber: true,
          pageNumber: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          completionSeconds: true,
          isLate: true,
          lateBySeconds: true,
          isOverTimeLimit: true,
          overtimeSeconds: true,
          score: true,
          teacherComment: true,
          firstPhotoKey: true,
          finalPhotoKey: true,
        },
      },
    },
  });
}

export async function getTeacherOccurrence(teacher: TeacherContext, occurrenceId: string) {
  await materializeOpenHomeworkExpectations(teacher.instituteId);
  return prisma.homeworkOccurrence.findFirst({
    where: {
      id: occurrenceId,
      instituteId: teacher.instituteId,
      schedule: { createdById: teacher.id },
    },
    select: {
      id: true, opensAt: true, dueAt: true, maxScoreSnapshot: true, timeLimitMinutesSnapshot: true,
      schedule: { select: { title: true, groupId: true, student: { select: { groupId: true } } } },
      expectations: {
        orderBy: { student: { name: "asc" } },
        select: {
          id: true, academicLevelNameSnapshot: true,
          student: { select: { id: true, name: true } },
          submissions: { orderBy: { attemptNumber: "desc" }, select: {
            id: true, attemptNumber: true, pageNumber: true, status: true, startedAt: true,
            submittedAt: true, completionSeconds: true, isLate: true, lateBySeconds: true,
            isOverTimeLimit: true, overtimeSeconds: true, score: true, teacherComment: true,
            firstPhotoKey: true, finalPhotoKey: true,
          } },
        },
      },
    },
  });
}

export async function getStudentHomework(studentId: string, instituteId: string) {
  await maintainHomework(instituteId);
  return prisma.homeworkExpectation.findMany({
    where: { studentId, instituteId, occurrence: { cancelledAt: null } },
    orderBy: { occurrence: { opensAt: "desc" } },
    select: {
      id: true, academicLevelNameSnapshot: true,
      occurrence: { select: {
        opensAt: true, dueAt: true, maxScoreSnapshot: true, timeLimitMinutesSnapshot: true,
        showTimerSnapshot: true, schedule: { select: { title: true } },
      } },
      submissions: { orderBy: { attemptNumber: "desc" }, select: {
        id: true, attemptNumber: true, pageNumber: true, status: true, startedAt: true,
        submittedAt: true, score: true, teacherComment: true, isLate: true, isOverTimeLimit: true,
      } },
    },
  });
}

export async function startHomeworkSubmission(
  student: { id: string; instituteId: string },
  expectationId: string,
  pageNumber: string,
  firstPhoto: File,
) {
  const page = pageNumber.trim();
  if (!page || page.length > 80) throw new HomeworkError("Enter a valid page number.");
  const expectation = await prisma.homeworkExpectation.findFirst({
    where: { id: expectationId, studentId: student.id, instituteId: student.instituteId },
    select: {
      id: true, academicLevelIdSnapshot: true,
      student: { select: { academicLevelId: true, academicLevel: { select: { name: true } } } },
      occurrence: { select: { opensAt: true, cancelledAt: true, allowSamePageAgainSnapshot: true } },
      submissions: { orderBy: { attemptNumber: "desc" }, select: { attemptNumber: true, status: true, pageNumber: true } },
    },
  });
  if (!expectation || expectation.occurrence.cancelledAt) throw new HomeworkError("Homework is not available.");
  if (expectation.occurrence.opensAt > new Date()) throw new HomeworkError("This homework has not opened yet.");
  let academicLevelIdSnapshot = expectation.academicLevelIdSnapshot;
  if (!academicLevelIdSnapshot && expectation.student.academicLevelId) {
    academicLevelIdSnapshot = expectation.student.academicLevelId;
    await prisma.homeworkExpectation.update({
      where: { id: expectation.id },
      data: {
        academicLevelIdSnapshot,
        academicLevelNameSnapshot: expectation.student.academicLevel?.name ?? null,
      },
    });
  }
  if (!academicLevelIdSnapshot) throw new HomeworkError("Ask your teacher to assign your Academic Level first.");
  const latest = expectation.submissions[0];
  if (latest?.status === HomeworkSubmissionStatus.IN_PROGRESS) throw new HomeworkError("Finish your current attempt first.");
  if (latest && latest.status !== HomeworkSubmissionStatus.RESUBMISSION_REQUESTED) {
    throw new HomeworkError("This homework has already been submitted.");
  }
  if (!expectation.occurrence.allowSamePageAgainSnapshot) {
    const approvedDuplicate = await prisma.homeworkSubmission.findFirst({
      where: {
        pageNumber: { equals: page, mode: "insensitive" },
        status: HomeworkSubmissionStatus.APPROVED,
        expectation: {
          studentId: student.id,
          academicLevelIdSnapshot,
        },
      },
      select: { id: true },
    });
    if (approvedDuplicate) {
      throw new HomeworkError("You already completed this page at this Academic Level. Choose another page.");
    }
  }

  const key = await storeHomeworkPhoto(student.instituteId, student.id, "first", firstPhoto);
  try {
    return await prisma.homeworkSubmission.create({
      data: {
        expectationId: expectation.id,
        attemptNumber: (latest?.attemptNumber ?? 0) + 1,
        pageNumber: page,
        firstPhotoKey: key,
      },
    });
  } catch (error) {
    await removeHomeworkPhoto(key);
    throw error;
  }
}

export async function finishHomeworkSubmission(
  student: { id: string; instituteId: string },
  submissionId: string,
  finalPhoto: File,
) {
  const submission = await prisma.homeworkSubmission.findFirst({
    where: {
      id: submissionId,
      status: HomeworkSubmissionStatus.IN_PROGRESS,
      expectation: { studentId: student.id, instituteId: student.instituteId },
    },
    select: {
      id: true, startedAt: true,
      expectation: { select: { occurrence: { select: { dueAt: true, timeLimitMinutesSnapshot: true } } } },
    },
  });
  if (!submission) throw new HomeworkError("Active homework attempt not found.");
  const key = await storeHomeworkPhoto(student.instituteId, student.id, "final", finalPhoto);
  const submittedAt = new Date();
  try {
    return await prisma.homeworkSubmission.update({
      where: { id: submission.id },
      data: {
        finalPhotoKey: key,
        submittedAt,
        status: HomeworkSubmissionStatus.SUBMITTED,
        ...homeworkTiming(submission.startedAt, submittedAt, submission.expectation.occurrence.dueAt, submission.expectation.occurrence.timeLimitMinutesSnapshot),
      },
    });
  } catch (error) {
    await removeHomeworkPhoto(key);
    throw error;
  }
}

export async function reviewHomeworkSubmission(
  teacher: TeacherContext,
  input: { submissionId: string; status: HomeworkSubmissionStatus; score?: number | null; comment?: string | null },
) {
  const allowed: HomeworkSubmissionStatus[] = [HomeworkSubmissionStatus.APPROVED, HomeworkSubmissionStatus.REJECTED, HomeworkSubmissionStatus.RESUBMISSION_REQUESTED];
  if (!allowed.includes(input.status)) throw new HomeworkError("Choose a valid review decision.");
  const submission = await prisma.homeworkSubmission.findFirst({
    where: {
      id: input.submissionId,
      expectation: {
        instituteId: teacher.instituteId,
        occurrence: { schedule: { createdById: teacher.id } },
      },
    },
    select: { id: true, status: true, finalPhotoKey: true, expectation: { select: { student: { select: { name: true } }, occurrence: { select: { maxScoreSnapshot: true } } } } },
  });
  if (!submission) throw new HomeworkError("Submission not found or not managed by you.");
  if (submission.status === HomeworkSubmissionStatus.IN_PROGRESS || !submission.finalPhotoKey) {
    throw new HomeworkError("The student must submit the final photo before review.");
  }
  const max = Number(submission.expectation.occurrence.maxScoreSnapshot.toString());
  const score = input.score ?? null;
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > max)) {
    throw new HomeworkError(`Score must be between 0 and ${max}.`);
  }
  if (input.status === HomeworkSubmissionStatus.APPROVED && score === null) {
    throw new HomeworkError("Enter a score before approving.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.homeworkSubmission.update({
      where: { id: submission.id },
      data: {
        status: input.status,
        score,
        teacherComment: input.comment?.trim() || null,
        reviewedById: teacher.id,
        reviewedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        instituteId: teacher.instituteId,
        actorUserId: teacher.id,
        actorRole: Role.TEACHER,
        action: AuditAction.HOMEWORK_SUBMISSION_REVIEWED,
        targetType: "HomeworkSubmission",
        targetId: submission.id,
        summary: `Reviewed ${submission.expectation.student.name}'s homework: ${input.status}.`,
        metadata: { status: input.status, score },
      },
    });
  });
}

export async function getHomeworkPhotoAccess(user: { id: string; instituteId: string; role: Role }, submissionId: string, kind: "first" | "final") {
  const submission = await prisma.homeworkSubmission.findFirst({
    where: { id: submissionId, expectation: { instituteId: user.instituteId } },
    select: {
      firstPhotoKey: true, finalPhotoKey: true,
      expectation: { select: { studentId: true, occurrence: { select: { schedule: { select: { createdById: true } } } } } },
    },
  });
  if (!submission) return null;
  const allowed = canAccessHomeworkPhoto({
    role: user.role,
    userId: user.id,
    studentId: submission.expectation.studentId,
    scheduleCreatorId: submission.expectation.occurrence.schedule.createdById,
  });
  if (!allowed) return null;
  return kind === "first" ? submission.firstPhotoKey : submission.finalPhotoKey;
}
