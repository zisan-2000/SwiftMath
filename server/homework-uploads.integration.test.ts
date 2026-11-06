import { createHash, randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import sharp from "sharp";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  HomeworkUploadError,
  type HomeworkUploadTicket,
} from "@/lib/homework-upload";

const context = vi.hoisted(() => ({
  prisma: null as unknown as PrismaClient,
  session: null as { id: string; instituteId: string; role: string } | null,
  permission: true,
  objects: new Map<string, { bytes: Buffer; type: string }>(),
  storageDown: false,
  deletes: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return context.prisma;
  },
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: async () => context.session,
}));
vi.mock("@/server/permissions", () => ({
  can: async () => context.permission,
}));
vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();
  return {
    ...actual,
    head: async (pathname: string) => {
      if (context.storageDown)
        throw new Error("synthetic-secret-must-not-be-logged");
      const object = context.objects.get(pathname);
      if (!object) throw new actual.BlobNotFoundError();
      return { pathname, size: object.bytes.length, contentType: object.type };
    },
    get: async (pathname: string) => {
      if (context.storageDown)
        throw new Error("synthetic-secret-must-not-be-logged");
      const object = context.objects.get(pathname);
      return object
        ? {
            statusCode: 200,
            stream: new Response(new Uint8Array(object.bytes)).body,
            blob: { contentType: object.type },
          }
        : null;
    },
    del: async (pathname: string) => {
      context.deletes.push(pathname);
      context.objects.delete(pathname);
    },
  };
});

const url = process.env.CLASS_PERFORMANCE_TEST_DATABASE_URL;
describe.skipIf(!url)(
  "Homework direct uploads on isolated PostgreSQL and private mock storage",
  () => {
    let service: typeof import("@/server/homework-uploads"),
      homework: typeof import("@/server/homework");
    let metadata: typeof import("@/app/api/student/homework/uploads/route"),
      target: typeof import("@/app/api/student/homework/uploads/[uploadId]/route"),
      blobRoute: typeof import("@/app/api/student/homework/blob/route");
    let student: { id: string; instituteId: string },
      teacher: { id: string; instituteId: string; role: "TEACHER" },
      other: { id: string; instituteId: string },
      foreign: { id: string; instituteId: string };
    let scheduleId: string, levelId: string, groupId: string, jpeg: Buffer;
    let sequence = 0;
    const hash = (bytes: Buffer) =>
      createHash("sha256").update(bytes).digest("hex");
    const jsonRequest = (
      path: string,
      body: unknown,
      origin = "https://upload.invalid",
    ) =>
      new Request(`https://upload.invalid${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
      });
    const routeContext = (id: string) => ({
      params: Promise.resolve({ uploadId: id }),
    });
    async function expectation(
      options: {
        allowSamePage?: boolean;
        cancelled?: boolean;
        future?: boolean;
        late?: boolean;
      } = {},
    ) {
      const occurrence = await context.prisma.homeworkOccurrence.create({
        data: {
          instituteId: student.instituteId,
          scheduleId,
          opensAt: new Date(
            Date.now() +
              (options.future ? 86400000 : -86400000) -
              sequence++ * 1000,
          ),
          dueAt: new Date(Date.now() + (options.late ? -60000 : 86400000)),
          maxScoreSnapshot: 10,
          timeLimitMinutesSnapshot: 30,
          showTimerSnapshot: true,
          allowSamePageAgainSnapshot: options.allowSamePage ?? true,
          expectationsMaterializedAt: new Date(),
          cancelledAt: options.cancelled ? new Date() : null,
        },
      });
      return context.prisma.homeworkExpectation.create({
        data: {
          instituteId: student.instituteId,
          studentId: student.id,
          occurrenceId: occurrence.id,
          academicLevelIdSnapshot: levelId,
          academicLevelNameSnapshot: "Frozen academic level",
        },
      });
    }
    async function ticket(
      expectationId: string,
      bytes = jpeg,
      extra: Record<string, unknown> = {},
    ) {
      return service.createHomeworkUpload(student, {
        requestId: randomUUID(),
        kind: "FIRST",
        expectationId,
        pageNumber: `Page ${sequence}`,
        byteSize: bytes.length,
        contentType: "image/jpeg",
        sha256: hash(bytes),
        ...extra,
      });
    }
    const store = (ticket: HomeworkUploadTicket, bytes = jpeg) =>
      context.objects.set(ticket.pathname, { bytes, type: ticket.contentType });
    async function start() {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      const result = await service.finalizeHomeworkUpload(student, upload.id);
      return { row, upload, result };
    }
    async function finalTicket(submissionId: string) {
      return service.createHomeworkUpload(student, {
        requestId: randomUUID(),
        kind: "FINAL",
        submissionId,
        byteSize: jpeg.length,
        contentType: "image/jpeg",
        sha256: hash(jpeg),
      });
    }
    beforeAll(async () => {
      const parsed = new URL(url!);
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
        !/^\/swiftmath_cp_regression_\d+$/.test(parsed.pathname)
      )
        throw new Error("Dedicated local test database required.");
      vi.stubEnv(
        "BLOB_READ_WRITE_TOKEN",
        "vercel_blob_rw_localtest_NOT_A_REAL_TOKEN",
      );
      vi.stubEnv("BETTER_AUTH_URL", "https://upload.invalid");
      context.prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url! }),
      });
      const institute = await context.prisma.institute.create({
        data: { name: "Synthetic upload tests", slug: randomUUID() },
      });
      const makeUser = (
        role: "TEACHER" | "STUDENT",
        instituteId = institute.id,
      ) =>
        context.prisma.user.create({
          data: {
            name: `Synthetic ${role}`,
            email: `${randomUUID()}@invalid.test`,
            role,
            instituteId,
          },
        });
      teacher = { ...(await makeUser("TEACHER")), role: "TEACHER" };
      groupId = (
        await context.prisma.group.create({
          data: {
            name: "Upload group",
            instituteId: institute.id,
            teacherId: teacher.id,
          },
        })
      ).id;
      levelId = (
        await context.prisma.academicLevel.create({
          data: {
            name: "Teacher level",
            orderIndex: 1,
            instituteId: institute.id,
          },
        })
      ).id;
      const user = await makeUser("STUDENT");
      student = { id: user.id, instituteId: user.instituteId };
      await context.prisma.user.update({
        where: { id: student.id },
        data: { academicLevelId: levelId, groupId },
      });
      other = await makeUser("STUDENT");
      const second = await context.prisma.institute.create({
        data: { name: "Foreign tenant", slug: randomUUID() },
      });
      foreign = await makeUser("STUDENT", second.id);
      scheduleId = (
        await context.prisma.homeworkSchedule.create({
          data: {
            instituteId: institute.id,
            createdById: teacher.id,
            groupId,
            mode: "MANUAL_SPECIFIC",
            targetType: "GROUP",
            title: "Upload regression",
            startDate: new Date("2020-01-01"),
            manualOpensAt: new Date("2020-01-01"),
            manualDueAt: new Date("2020-01-02"),
            maxScore: 10,
            timeLimitMinutes: 30,
          },
        })
      ).id;
      jpeg = await sharp({
        create: { width: 128, height: 128, channels: 3, background: "#fff" },
      })
        .jpeg()
        .toBuffer();
      service = await import("@/server/homework-uploads");
      homework = await import("@/server/homework");
      metadata = await import("@/app/api/student/homework/uploads/route");
      target =
        await import("@/app/api/student/homework/uploads/[uploadId]/route");
      blobRoute = await import("@/app/api/student/homework/blob/route");
      context.session = { ...student, role: "STUDENT" };
    });
    afterAll(async () => {
      await context.prisma?.$disconnect();
      vi.unstubAllEnvs();
    });
    beforeEach(async () => {
      await context.prisma.homeworkPhotoUpload.updateMany({
        where: { status: "PENDING" },
        data: { expiresAt: new Date(Date.now() - 3600000) },
      });
    });

    it("preserves genuine historical submission fields and private keys after additive migration", async () => {
      const row = await context.prisma.homeworkSubmission.findUniqueOrThrow({
        where: { id: "upload-migration-submission" },
      });
      expect(row.firstPhotoKey).toBe("blob:homework/legacy-first.jpg");
      expect(row.finalPhotoKey).toBe("blob:homework/legacy-final.jpg");
      expect(Number(row.score)).toBe(8.5);
      expect(row.status).toBe("APPROVED");
      expect(row.completionSeconds).toBe(272);
    });
    it.each([1, 2, 4, 5, 8])(
      "finalizes a %i MiB image with metadata only, preserving exact bytes",
      async (mib) => {
        const row = await expectation(),
          bytes = Buffer.concat([
            jpeg,
            Buffer.alloc(mib * 1048576 - jpeg.length),
          ]),
          upload = await ticket(row.id, bytes);
        store(upload, bytes);
        const before = Date.now();
        const result = await service.finalizeHomeworkUpload(student, upload.id);
        const saved = await context.prisma.homeworkSubmission.findUniqueOrThrow(
          { where: { id: result.submissionId } },
        );
        expect(saved.startedAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(saved.firstPhotoKey).toBe(`blob:${upload.pathname}`);
        expect(saved.pageNumber).toBe(upload.pageNumber);
        expect(context.objects.get(upload.pathname)?.bytes.equals(bytes)).toBe(
          true,
        );
      },
    );
    it("does not start timer before the first photo is verified and finalized", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      expect(
        await context.prisma.homeworkSubmission.count({
          where: { expectationId: row.id },
        }),
      ).toBe(0);
      await expect(
        service.finalizeHomeworkUpload(student, upload.id),
      ).rejects.toMatchObject({ code: "PHOTO_NOT_READY" });
      expect(
        await context.prisma.homeworkSubmission.count({
          where: { expectationId: row.id },
        }),
      ).toBe(0);
    });
    it("handles final photo, server timing and lost-response retries without changing completion time", async () => {
      const { result } = await start();
      const startedAt = new Date(Date.now() - 272000);
      await context.prisma.homeworkSubmission.update({
        where: { id: result.submissionId },
        data: { startedAt },
      });
      const upload = await finalTicket(result.submissionId);
      store(upload);
      await service.finalizeHomeworkUpload(student, upload.id);
      const before = await context.prisma.homeworkSubmission.findUniqueOrThrow({
        where: { id: result.submissionId },
      });
      expect(before.status).toBe("SUBMITTED");
      expect(before.completionSeconds).toBeGreaterThanOrEqual(272);
      expect(before.completionSeconds).toBeLessThan(280);
      expect(before.startedAt).toEqual(startedAt);
      expect(before.finalPhotoKey).toBe(`blob:${upload.pathname}`);
      expect(
        (await service.finalizeHomeworkUpload(student, upload.id)).recovered,
      ).toBe(true);
      expect(
        await context.prisma.homeworkSubmission.findUnique({
          where: { id: result.submissionId },
        }),
      ).toEqual(before);
    });
    it("keeps late-submission rules based on the server due date", async () => {
      const row = await expectation({ late: true }),
        first = await ticket(row.id);
      store(first);
      const result = await service.finalizeHomeworkUpload(student, first.id),
        last = await finalTicket(result.submissionId);
      store(last);
      await service.finalizeHomeworkUpload(student, last.id);
      const saved = await context.prisma.homeworkSubmission.findUniqueOrThrow({
        where: { id: result.submissionId },
      });
      expect(saved.isLate).toBe(true);
      expect(saved.lateBySeconds).toBeGreaterThanOrEqual(60);
    });
    it("deduplicates authorization requests and refuses changed page/file for the same request ID", async () => {
      const row = await expectation(),
        requestId = randomUUID(),
        first = await ticket(row.id, jpeg, { requestId });
      expect((await ticket(row.id, jpeg, { requestId })).id).toBe(first.id);
      await expect(
        ticket(row.id, jpeg, { requestId, pageNumber: "Different page" }),
      ).rejects.toMatchObject({ code: "INTENT_CONFLICT" });
    });
    it("concurrent same-ticket finalization creates exactly one attempt", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      const results = await Promise.all([
        service.finalizeHomeworkUpload(student, upload.id),
        service.finalizeHomeworkUpload(student, upload.id),
      ]);
      expect(results[0].submissionId).toBe(results[1].submissionId);
      expect(
        await context.prisma.homeworkSubmission.count({
          where: { expectationId: row.id },
        }),
      ).toBe(1);
    });
    it("concurrent different tickets for one first attempt cannot create duplicates", async () => {
      const row = await expectation(),
        a = await ticket(row.id),
        b = await ticket(row.id);
      store(a);
      store(b);
      const results = await Promise.allSettled([
        service.finalizeHomeworkUpload(student, a.id),
        service.finalizeHomeworkUpload(student, b.id),
      ]);
      expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      expect(
        await context.prisma.homeworkSubmission.count({
          where: { expectationId: row.id },
        }),
      ).toBe(1);
    });
    it("concurrent final-photo tickets cannot overwrite the winning photo", async () => {
      const { result } = await start(),
        a = await finalTicket(result.submissionId),
        b = await finalTicket(result.submissionId);
      store(a);
      store(b);
      const results = await Promise.allSettled([
        service.finalizeHomeworkUpload(student, a.id),
        service.finalizeHomeworkUpload(student, b.id),
      ]);
      expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      const saved = await context.prisma.homeworkSubmission.findUniqueOrThrow({
        where: { id: result.submissionId },
      });
      const winner = results[0].status === "fulfilled" ? a : b;
      expect(saved.finalPhotoKey).toBe(`blob:${winner.pathname}`);
    });
    it("different occurrences finalize independently", async () => {
      const a = await expectation(),
        b = await expectation(),
        ta = await ticket(a.id),
        tb = await ticket(b.id);
      store(ta);
      store(tb);
      const results = await Promise.all([
        service.finalizeHomeworkUpload(student, ta.id),
        service.finalizeHomeworkUpload(student, tb.id),
      ]);
      expect(results[0].submissionId).not.toBe(results[1].submissionId);
    });
    it("rolls back ticket claim when database mutation fails and recovers on retry", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      await context.prisma.$executeRawUnsafe(
        `CREATE FUNCTION reject_synthetic_upload() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic database outage'; END $$`,
      );
      await context.prisma.$executeRawUnsafe(
        `CREATE TRIGGER reject_synthetic_upload BEFORE INSERT ON homework_submission FOR EACH ROW EXECUTE FUNCTION reject_synthetic_upload()`,
      );
      try {
        await expect(
          service.finalizeHomeworkUpload(student, upload.id),
        ).rejects.toThrow();
        expect(
          (
            await context.prisma.homeworkPhotoUpload.findUniqueOrThrow({
              where: { id: upload.id },
            })
          ).status,
        ).toBe("PENDING");
      } finally {
        await context.prisma.$executeRawUnsafe(
          `DROP TRIGGER reject_synthetic_upload ON homework_submission`,
        );
        await context.prisma.$executeRawUnsafe(
          `DROP FUNCTION reject_synthetic_upload()`,
        );
      }
      expect(
        (await service.finalizeHomeworkUpload(student, upload.id)).submissionId,
      ).toBeTruthy();
    });
    it("keeps pending uploads recoverable after storage failure", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      context.storageDown = true;
      try {
        await expect(
          service.finalizeHomeworkUpload(student, upload.id),
        ).rejects.toThrow();
      } finally {
        context.storageDown = false;
      }
      expect(
        (await service.finalizeHomeworkUpload(student, upload.id)).submissionId,
      ).toBeTruthy();
    });
    it("rejects hash, byte-length, type mismatch and malformed images before submission writes", async () => {
      for (const mode of ["hash", "length", "type", "invalid"]) {
        const bytes =
          mode === "invalid"
            ? Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(32)])
            : jpeg;
        const row = await expectation(),
          upload = await ticket(row.id, bytes);
        store(
          upload,
          mode === "hash"
            ? Buffer.alloc(bytes.length)
            : mode === "length"
              ? Buffer.alloc(1)
              : bytes,
        );
        if (mode === "type")
          context.objects.get(upload.pathname)!.type = "image/png";
        await expect(
          service.finalizeHomeworkUpload(student, upload.id),
        ).rejects.toBeInstanceOf(HomeworkUploadError);
        expect(
          await context.prisma.homeworkSubmission.count({
            where: { expectationId: row.id },
          }),
        ).toBe(0);
      }
    });
    it("rejects invalid sizes, prototype MIME types and unsupported formats", async () => {
      const row = await expectation();
      for (const extra of [
        { byteSize: 0 },
        { byteSize: 8 * 1048576 + 1 },
        { contentType: "toString" },
        { contentType: "image/svg+xml" },
        { sha256: "bad" },
      ])
        await expect(ticket(row.id, jpeg, extra)).rejects.toMatchObject({
          code: "UPLOAD_DETAILS",
        });
    });
    it("rejects expired tickets and token grants", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      await context.prisma.homeworkPhotoUpload.update({
        where: { id: upload.id },
        data: { expiresAt: new Date(Date.now() - 1) },
      });
      await expect(
        service.finalizeHomeworkUpload(student, upload.id),
      ).rejects.toMatchObject({ code: "UPLOAD_EXPIRED" });
      await expect(
        service.homeworkUploadAuthorization(
          student,
          upload.id,
          upload.pathname,
        ),
      ).rejects.toMatchObject({ code: "UPLOAD_EXPIRED" });
    });
    it("binds short-lived tokens to exact pathname, MIME and byte count", async () => {
      const row = await expectation(),
        upload = await ticket(row.id),
        scope = await service.homeworkUploadAuthorization(
          student,
          upload.id,
          upload.pathname,
        );
      expect(scope.maximumSizeInBytes).toBe(jpeg.length);
      expect(scope.allowedContentTypes).toEqual(["image/jpeg"]);
      expect(scope.allowOverwrite).toBe(false);
      expect(scope.addRandomSuffix).toBe(false);
      expect(scope.validUntil - Date.now()).toBeLessThanOrEqual(600000);
      await expect(
        service.homeworkUploadAuthorization(
          student,
          upload.id,
          upload.pathname + ".other",
        ),
      ).rejects.toMatchObject({ code: "PATH_SCOPE" });
    });
    it("rejects cross-student and cross-institute authorization/status/finalize", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      for (const actor of [other, foreign]) {
        await expect(
          service.homeworkUploadStatus(actor, upload.id),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          service.finalizeHomeworkUpload(actor, upload.id),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          ticket(row.id, jpeg, { expectationId: "no-such-homework" }),
        ).rejects.toThrow();
      }
    });
    it("rejects closed/cancelled/upcoming homework and missing Academic Level", async () => {
      for (const option of [{ cancelled: true }, { future: true }]) {
        const row = await expectation(option);
        await expect(ticket(row.id)).rejects.toThrow();
      }
      const row = await expectation();
      await context.prisma.homeworkExpectation.update({
        where: { id: row.id },
        data: { academicLevelIdSnapshot: null },
      });
      await context.prisma.user.update({
        where: { id: student.id },
        data: { academicLevelId: null },
      });
      try {
        await expect(ticket(row.id)).rejects.toThrow("Academic Level");
      } finally {
        await context.prisma.user.update({
          where: { id: student.id },
          data: { academicLevelId: levelId },
        });
      }
    });
    it("preserves approved duplicate-page protection and appends Attempt 2 after resubmission", async () => {
      const { row, result } = await start(),
        submission = await context.prisma.homeworkSubmission.findUniqueOrThrow({
          where: { id: result.submissionId },
        });
      await context.prisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: "APPROVED",
          score: 9,
          finalPhotoKey: "blob:homework/old-reviewed.jpg",
        },
      });
      const next = await expectation({ allowSamePage: false });
      await expect(
        ticket(next.id, jpeg, { pageNumber: submission.pageNumber }),
      ).rejects.toThrow("already completed");
      await context.prisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: { status: "RESUBMISSION_REQUESTED" },
      });
      const retry = await ticket(row.id, jpeg, {
        pageNumber: submission.pageNumber,
      });
      store(retry);
      const result2 = await service.finalizeHomeworkUpload(student, retry.id);
      expect(
        (
          await context.prisma.homeworkSubmission.findUniqueOrThrow({
            where: { id: result2.submissionId },
          })
        ).attemptNumber,
      ).toBe(2);
      expect(
        (
          await context.prisma.homeworkSubmission.findUniqueOrThrow({
            where: { id: submission.id },
          })
        ).score?.toString(),
      ).toBe("9");
    });
    it("keeps the historical Academic Level snapshot after the student moves", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      store(upload);
      await context.prisma.user.update({
        where: { id: student.id },
        data: { groupId: null, academicLevelId: null },
      });
      try {
        const result = await service.finalizeHomeworkUpload(student, upload.id);
        expect(
          await homework.getHomeworkPhotoAccess(
            { ...teacher, role: "TEACHER" },
            result.submissionId,
            "first",
          ),
        ).toBe(`blob:${upload.pathname}`);
        expect(
          await homework.getHomeworkPhotoAccess(
            { ...other, role: "TEACHER" },
            result.submissionId,
            "first",
          ),
        ).toBeNull();
        expect(
          (
            await context.prisma.homeworkExpectation.findUniqueOrThrow({
              where: { id: row.id },
            })
          ).academicLevelNameSnapshot,
        ).toBe("Frozen academic level");
      } finally {
        await context.prisma.user.update({
          where: { id: student.id },
          data: { groupId, academicLevelId: levelId },
        });
      }
    });
    it("preserves student, original teacher and institute-admin private photo access", async () => {
      const { result, upload } = await start();
      for (const actor of [
        { ...student, role: "STUDENT" as const },
        teacher,
        { ...other, role: "ADMIN" as const },
      ])
        expect(
          await homework.getHomeworkPhotoAccess(
            actor,
            result.submissionId,
            "first",
          ),
        ).toBe(`blob:${upload.pathname}`);
      expect(
        await homework.getHomeworkPhotoAccess(
          { ...foreign, role: "ADMIN" },
          result.submissionId,
          "first",
        ),
      ).toBeNull();
    });
    it("returns actionable session, CSRF, role and inactive-account errors without redirects", async () => {
      const call = () =>
        metadata.POST(jsonRequest("/api/student/homework/uploads", {}));
      context.session = null;
      expect((await call()).status).toBe(401);
      context.session = { ...teacher, role: "TEACHER" };
      expect((await call()).status).toBe(403);
      context.session = { ...student, role: "STUDENT" };
      expect(
        (
          await metadata.POST(
            jsonRequest(
              "/api/student/homework/uploads",
              {},
              "https://evil.invalid",
            ),
          )
        ).status,
      ).toBe(403);
      await context.prisma.user.update({
        where: { id: student.id },
        data: { isActive: false },
      });
      try {
        expect((await call()).status).toBe(403);
      } finally {
        await context.prisma.user.update({
          where: { id: student.id },
          data: { isActive: true },
        });
      }
      context.permission = false;
      try {
        expect((await call()).status).toBe(403);
      } finally {
        context.permission = true;
      }
    });
    it("limits metadata payload to 16 KiB and emits no private error data", async () => {
      expect(
        (
          await metadata.POST(
            jsonRequest("/api/student/homework/uploads", {
              padding: "x".repeat(17000),
            }),
          )
        ).status,
      ).toBe(413);
      const row = await expectation(),
        upload = await ticket(row.id);
      context.storageDown = true;
      const logs = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const response = await target.POST(
          jsonRequest(`/api/student/homework/uploads/${upload.id}`, {}),
          routeContext(upload.id),
        );
        expect(response.status).toBe(503);
        const body = await response.text();
        expect(body).not.toContain("synthetic-secret");
        expect(JSON.stringify(logs.mock.calls)).not.toContain(
          "synthetic-secret",
        );
        expect(JSON.stringify(logs.mock.calls)).not.toContain(student.id);
      } finally {
        context.storageDown = false;
        logs.mockRestore();
      }
    });
    it("accepts the configured auth origin behind a reverse proxy and rejects a forged origin", async () => {
      const row = await expectation();
      const body = {
        requestId: randomUUID(),
        kind: "FIRST",
        expectationId: row.id,
        pageNumber: "proxy-49",
        byteSize: jpeg.length,
        contentType: "image/jpeg",
        sha256: hash(jpeg),
      };
      const response = await metadata.POST(
        new Request(
          "http://internal-backend:3401/api/student/homework/uploads",
          {
            method: "POST",
            headers: {
              Origin: "https://upload.invalid",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        ),
      );
      expect(response.status).toBe(200);
      expect(
        (
          await metadata.POST(
            jsonRequest(
              "/api/student/homework/uploads",
              body,
              "http://internal-backend:3401",
            ),
          )
        ).status,
      ).toBe(403);
    });
    it("uses real SDK token signing and rejects forged completion callbacks", async () => {
      const row = await expectation(),
        upload = await ticket(row.id);
      const response = await blobRoute.POST(
        jsonRequest("/api/student/homework/blob", {
          type: "blob.generate-client-token",
          payload: {
            pathname: upload.pathname,
            clientPayload: JSON.stringify({ uploadId: upload.id }),
          },
        }),
      );
      expect(response.status).toBe(200);
      const token = (await response.json()).clientToken as string;
      expect(token).toMatch(/^vercel_blob_client_localtest_/);
      expect(token).not.toContain("NOT_A_REAL_TOKEN");
      const decoded = JSON.parse(
        Buffer.from(
          Buffer.from(token.split("_")[4], "base64").toString().split(".")[1],
          "base64",
        ).toString(),
      );
      expect(decoded.pathname).toBe(upload.pathname);
      expect(decoded.maximumSizeInBytes).toBe(jpeg.length);
      const forged = await blobRoute.POST(
        jsonRequest("/api/student/homework/blob", {
          type: "blob.upload-completed",
          payload: {
            blob: { pathname: upload.pathname },
            tokenPayload: JSON.stringify({ uploadId: upload.id }),
          },
        }),
      );
      expect(forged.status).toBe(403);
    });
    it("disables binary API fallback and fails closed without storage configuration in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
      try {
        expect(
          (
            await target.PUT(
              new Request("https://upload.invalid/test", {
                method: "PUT",
                body: "photo",
              }),
              routeContext(randomUUID()),
            )
          ).status,
        ).toBe(404);
        const row = await expectation();
        await expect(ticket(row.id)).rejects.toMatchObject({
          code: "STORAGE_CONFIG",
        });
      } finally {
        vi.stubEnv("NODE_ENV", "test");
        vi.stubEnv(
          "BLOB_READ_WRITE_TOKEN",
          "vercel_blob_rw_localtest_NOT_A_REAL_TOKEN",
        );
      }
    });
    it("cleans only expired unreferenced new objects, preserving finalized and legacy photos", async () => {
      const finalized = await start(),
        row = await expectation(),
        expired = await ticket(row.id);
      store(expired);
      await context.prisma.homeworkPhotoUpload.update({
        where: { id: expired.id },
        data: { expiresAt: new Date(Date.now() - 49 * 3600000) },
      });
      await service.cleanupExpiredHomeworkUploads(100);
      expect(context.deletes).toContain(expired.pathname);
      expect(context.objects.has(finalized.upload.pathname)).toBe(true);
      expect(context.deletes.some((x) => x.startsWith("homework/"))).toBe(
        false,
      );
      expect(
        (
          await context.prisma.homeworkSubmission.findUniqueOrThrow({
            where: { id: "upload-migration-submission" },
          })
        ).score?.toString(),
      ).toBe("8.5");
    });
  },
);
