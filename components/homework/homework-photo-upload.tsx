"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HomeworkUploadError,
  type HomeworkUploadTicket,
} from "@/lib/homework-upload";
import {
  homeworkUploadRequest,
  prepareHomeworkPhoto,
  uploadLocalPhoto,
} from "@/lib/homework-upload-client";

export function HomeworkPhotoUpload({
  kind,
  expectationId,
  submissionId,
  studentId,
}: {
  kind: "FIRST" | "FINAL";
  expectationId?: string;
  submissionId?: string;
  studentId: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null),
    [page, setPage] = useState(""),
    [reduce, setReduce] = useState(false),
    [ticket, setTicket] = useState<HomeworkUploadTicket | null>(null);
  const [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [authError, setAuthError] = useState(false),
    [done, setDone] = useState(false),
    [note, setNote] = useState("");
  const abort = useRef<AbortController | null>(null),
    fileInput = useRef<HTMLInputElement | null>(null),
    active = useRef(false),
    requestId = useRef("");
  const recoveryKey = `homework-upload:v1:${studentId}:${kind}:${expectationId ?? submissionId}`;
  const inputId = `photo-${kind}-${expectationId ?? submissionId}`;
  function remember(value: HomeworkUploadTicket) {
    try {
      sessionStorage.setItem(
        recoveryKey,
        JSON.stringify({ v: 1, id: value.id, reduce }),
      );
    } catch {
      /* Private browsing can disable storage; in-memory retry still works. */
    }
  }
  function forget() {
    try {
      sessionStorage.removeItem(recoveryKey);
    } catch {}
  }
  useEffect(() => {
    let cancelled = false;
    let id: string | null = null;
    let reducePhoto = false;
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (saved?.startsWith("{")) {
        const recovery = JSON.parse(saved);
        if (recovery.v === 1 && typeof recovery.id === "string") {
          id = recovery.id;
          reducePhoto = recovery.reduce === true;
        }
      } else id = saved;
    } catch {}
    if (id && /^[a-f0-9-]{36}$/i.test(id)) {
      void homeworkUploadRequest<HomeworkUploadTicket>(
        `/api/student/homework/uploads/${id}`,
      )
        .then((value) => {
          if (!cancelled) {
            setTicket(value);
            setReduce(reducePhoto);
            if (value.pageNumber) setPage(value.pageNumber);
            setNote(
              "A previous upload can be recovered. Select Retry / Recover before choosing another photo.",
            );
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      abort.current?.abort();
    };
  }, [recoveryKey]);
  function changePhoto() {
    forget();
    setTicket(null);
    requestId.current = "";
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setError("");
    setNote("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError("");
    setAuthError(false);
    setProgress(0);
    const controller = new AbortController();
    abort.current = controller;
    let current = ticket;
    try {
      let prepared: Awaited<ReturnType<typeof prepareHomeworkPhoto>> | null =
        null;
      if (!current) {
        if (!file)
          throw new HomeworkUploadError("IMAGE_EMPTY", "Choose a photo first.");
        setStage("Checking photo…");
        prepared = await prepareHomeworkPhoto(file, reduce);
        if (!requestId.current) requestId.current = crypto.randomUUID();
        setNote(
          prepared.file.size < file.size
            ? `Photo reduced from ${(file.size / 1048576).toFixed(2)} to ${(prepared.file.size / 1048576).toFixed(2)} MiB. Compression was requested.`
            : `Original photo preserved · ${(prepared.file.size / 1048576).toFixed(2)} MiB.`,
        );
        setStage("Authorizing upload…");
        current = await homeworkUploadRequest<HomeworkUploadTicket>(
          "/api/student/homework/uploads",
          {
            requestId: requestId.current,
            kind,
            expectationId,
            submissionId,
            pageNumber: page,
            byteSize: prepared.file.size,
            contentType: prepared.file.type,
            sha256: prepared.sha256,
          },
          controller.signal,
        );
        setTicket(current);
        remember(current);
      }
      const finish = () =>
        homeworkUploadRequest<{ submissionId: string }>(
          `/api/student/homework/uploads/${current!.id}`,
          {},
          controller.signal,
        );
      setStage("Checking saved upload…");
      try {
        await finish();
      } catch (cause) {
        if (
          !(cause instanceof HomeworkUploadError) ||
          cause.code !== "PHOTO_NOT_READY"
        )
          throw cause;
        if (!prepared) {
          if (!file)
            throw new HomeworkUploadError(
              "SELECT_PHOTO",
              "The photo transfer is incomplete. Select the same photo to retry, or choose ‘Change photo / page’.",
            );
          prepared = await prepareHomeworkPhoto(file, reduce);
        }
        if (prepared.sha256 !== current.sha256)
          throw new HomeworkUploadError(
            "PHOTO_MISMATCH",
            "Select the original photo for this retry, or choose ‘Change photo / page’.",
          );
        setStage("Uploading photo…");
        try {
          if (current.transport === "local")
            await uploadLocalPhoto(
              current.id,
              prepared.file,
              controller.signal,
              setProgress,
            );
          else
            await upload(current.pathname, prepared.file, {
              access: "private",
              handleUploadUrl: "/api/student/homework/blob",
              clientPayload: JSON.stringify({ uploadId: current.id }),
              contentType: prepared.file.type,
              abortSignal: controller.signal,
              onUploadProgress: ({ percentage }) =>
                setProgress(Math.round(percentage)),
            });
        } catch (transferError) {
          // Lost upload acknowledgement / existing object: finalize the already stored object first.
          if (controller.signal.aborted) throw transferError;
          await finish();
        }
        setStage("Verifying and saving…");
        await finish();
      }
      forget();
      setDone(true);
      setStage(
        kind === "FIRST"
          ? "First photo saved. Timer started."
          : "Homework submitted for teacher review.",
      );
      router.refresh();
    } catch (cause) {
      console.warn(
        JSON.stringify({
          event: "homework-upload",
          stage: "client",
          code:
            cause instanceof HomeworkUploadError
              ? cause.code
              : "NETWORK_OR_STORAGE",
          status: cause instanceof HomeworkUploadError ? cause.status : 0,
          cancelled: controller.signal.aborted,
        }),
      );
      if (cause instanceof HomeworkUploadError) {
        setError(cause.message);
        setAuthError(cause.status === 401);
        if (["UPLOAD_EXPIRED", "INTENT_CONFLICT"].includes(cause.code)) {
          forget();
          setTicket(null);
          requestId.current = "";
        }
      } else
        setError(
          controller.signal.aborted
            ? "Upload paused. Retry to recover it; a saved submission will not be duplicated."
            : "Connection or storage interrupted. Check your connection and retry to recover the upload.",
        );
      if (current)
        void fetch("/api/student/homework/uploads/diagnostics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: current.id,
            status: cause instanceof HomeworkUploadError ? cause.status : 0,
          }),
          keepalive: true,
        }).catch(() => {});
    } finally {
      active.current = false;
      setBusy(false);
      abort.current = null;
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid min-w-0 gap-3 rounded-lg border p-4"
      aria-busy={busy}
    >
      {kind === "FIRST" && (
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-page`}>Page number</Label>
          <Input
            id={`${inputId}-page`}
            list="homework-page-suggestions"
            maxLength={80}
            value={page}
            onChange={(event) => setPage(event.target.value)}
            placeholder="Type or select a previous page"
            autoComplete="off"
            required
            disabled={busy || !!ticket || done}
          />
          <p className="text-xs text-muted-foreground">
            Type any page, or choose from your previous page history.
          </p>
        </div>
      )}
      {!done && (
        <>
          <div className="space-y-2">
            <Label htmlFor={inputId}>
              {kind === "FIRST" ? "First photo (starts timer)" : "Final photo"}
            </Label>
            <Input
              ref={fileInput}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP or HEIC/HEIF · up to 8 MiB. Keep all handwritten
              text readable.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={reduce}
              disabled={busy || !!ticket}
              onChange={(event) => setReduce(event.target.checked)}
            />
            Reduce photo size (optional). Keep off to preserve the original.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud aria-hidden="true" />
              )}
              {busy
                ? stage
                : ticket
                  ? "Retry / Recover upload"
                  : kind === "FIRST"
                    ? "Upload first photo & start"
                    : "Upload final photo & submit"}
            </Button>
            {busy ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => abort.current?.abort()}
              >
                Pause upload
              </Button>
            ) : (
              ticket && (
                <Button type="button" variant="outline" onClick={changePhoto}>
                  Change photo / page
                </Button>
              )
            )}
          </div>
        </>
      )}
      <div aria-live="polite" aria-atomic="true">
        {busy && (
          <div className="space-y-2 text-sm" role="status">
            <p>
              {stage}
              {stage === "Uploading photo…" ? ` ${progress}%` : ""}
            </p>
            {stage === "Uploading photo…" && (
              <progress
                className="h-2 w-full"
                value={progress}
                max={100}
                aria-label="Photo upload progress"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Keep this page open. Upload is complete only after “saved” is
              confirmed.
            </p>
          </div>
        )}
        {done && (
          <p role="status" className="text-sm text-success">
            {stage}
          </p>
        )}
        {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
      </div>
      {error && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
        >
          <p>{error}</p>
          {authError && (
            <a
              href="/login?redirect=%2Fstudent%2Fhomework"
              className="underline"
            >
              Sign in again
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
          >
            Refresh homework status
          </Button>
        </div>
      )}
      <noscript>
        Enable JavaScript to upload photos securely without the large-request
        limit.
      </noscript>
    </form>
  );
}
