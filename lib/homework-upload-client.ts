import {
  homeworkPhotoType,
  HOMEWORK_PHOTO_TYPES,
  HomeworkUploadError,
  MAX_HOMEWORK_PHOTO_BYTES,
  MAX_HOMEWORK_PHOTO_PIXELS,
  homeworkUploadMessage,
} from "./homework-upload";

export async function prepareHomeworkPhoto(file: File, reduce: boolean) {
  if (!file.size)
    throw new HomeworkUploadError("IMAGE_EMPTY", "Choose a photo first.");
  const type = homeworkPhotoType(
    new Uint8Array(await file.slice(0, 64).arrayBuffer()),
  );
  if (!type)
    throw new HomeworkUploadError(
      "IMAGE_FORMAT",
      "Choose a JPG, PNG, WebP or HEIC/HEIF photo.",
    );
  if (file.size > 32 * 1024 * 1024)
    throw new HomeworkUploadError(
      "IMAGE_SIZE",
      "This photo is too large. Use a lower camera resolution.",
    );
  let result = new File([file], `homework.${HOMEWORK_PHOTO_TYPES[type]}`, {
    type,
  });
  if (reduce && type !== "image/heic") {
    if (typeof createImageBitmap !== "function")
      throw new HomeworkUploadError(
        "IMAGE_COMPRESSION",
        "This browser cannot reduce photos. Turn off ‘Reduce photo size’ and retry with a photo up to 8 MiB.",
      );
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(result);
    } catch {
      throw new HomeworkUploadError(
        "IMAGE_INVALID",
        "This photo cannot be opened. Save it as JPG or retake it, then retry.",
      );
    }
    try {
      if (bitmap.width * bitmap.height > MAX_HOMEWORK_PHOTO_PIXELS)
        throw new HomeworkUploadError(
          "IMAGE_DIMENSIONS",
          "Use a lower camera resolution for this photo.",
        );
      const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      const context = canvas.getContext("2d");
      if (!context)
        throw new HomeworkUploadError(
          "IMAGE_COMPRESSION",
          "This browser cannot reduce the photo. Turn off ‘Reduce photo size’ and retry.",
        );
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(
                  new HomeworkUploadError(
                    "IMAGE_COMPRESSION",
                    "Could not reduce this photo. Turn off ‘Reduce photo size’ and retry.",
                  ),
                ),
          "image/jpeg",
          0.94,
        ),
      );
      if (blob.size < result.size)
        result = new File([blob], "homework.jpg", { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  }
  if (result.size > MAX_HOMEWORK_PHOTO_BYTES)
    throw new HomeworkUploadError(
      "IMAGE_SIZE",
      "Each uploaded photo must be 8 MiB or smaller. Enable ‘Reduce photo size’ or choose a lower camera resolution.",
    );
  const bytes = await result.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return {
    file: result,
    sha256: Array.from(new Uint8Array(digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export async function homeworkUploadRequest<T>(
  url: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
    cache: "no-store",
  });
  if (
    response.redirected ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new HomeworkUploadError(
      "SESSION_EXPIRED",
      homeworkUploadMessage(response.redirected ? 401 : response.status),
      response.redirected ? 401 : response.status,
    );
  const result = await response.json();
  if (!response.ok)
    throw new HomeworkUploadError(
      result.code ?? "HTTP_ERROR",
      result.error ?? homeworkUploadMessage(response.status),
      response.status,
    );
  return result as T;
}
export function uploadLocalPhoto(
  id: string,
  file: File,
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    const finish = (error?: Error) => {
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    xhr.open("PUT", `/api/student/homework/uploads/${id}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) finish();
      else {
        let data: { error?: string; code?: string } = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {}
        finish(
          new HomeworkUploadError(
            data.code ?? "HTTP_ERROR",
            data.error ?? homeworkUploadMessage(xhr.status),
            xhr.status,
          ),
        );
      }
    };
    xhr.onerror = () =>
      finish(
        new HomeworkUploadError(
          "NETWORK",
          "Connection interrupted. Retry to recover the uploaded photo.",
        ),
      );
    xhr.onabort = () =>
      finish(
        new HomeworkUploadError(
          "CANCELLED",
          "Upload paused. Retry to recover it; saved work is safe.",
        ),
      );
    xhr.timeout = 10 * 60 * 1000;
    xhr.ontimeout = () =>
      finish(
        new HomeworkUploadError(
          "NETWORK",
          "Upload timed out. Check your connection and retry.",
        ),
      );
    if (signal.aborted) {
      finish(
        new HomeworkUploadError(
          "CANCELLED",
          "Upload paused. Retry when ready.",
        ),
      );
      return;
    }
    xhr.send(file);
  });
}
