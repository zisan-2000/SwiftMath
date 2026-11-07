import "server-only";
import {
  homeworkPhotoType,
  MAX_HOMEWORK_PHOTO_BYTES,
  MAX_HOMEWORK_PHOTO_PIXELS,
  HomeworkUploadError,
} from "@/lib/homework-upload";

/** Native image processing must never be initialized merely to render homework. */
async function homeworkImageEngine() {
  try {
    return (await import("sharp")).default;
  } catch {
    throw new HomeworkUploadError(
      "IMAGE_PROCESSOR_UNAVAILABLE",
      "Photo processing is temporarily unavailable. Your uploaded photo is safe; please retry shortly.",
      503,
    );
  }
}

function checkDimensions(width: number, height: number) {
  if (!width || !height || width * height > MAX_HOMEWORK_PHOTO_PIXELS)
    throw new HomeworkUploadError(
      "IMAGE_DIMENSIONS",
      "This photo has too many pixels. Enable ‘Reduce photo size’ or choose a lower camera resolution.",
    );
}
export async function validateHomeworkImage(buffer: Buffer) {
  if (!buffer.length || buffer.length > MAX_HOMEWORK_PHOTO_BYTES)
    throw new HomeworkUploadError(
      "IMAGE_SIZE",
      "Choose a photo between 1 byte and 8 MiB.",
    );
  const type = homeworkPhotoType(buffer);
  if (!type)
    throw new HomeworkUploadError(
      "IMAGE_FORMAT",
      "Choose a JPG, PNG, WebP or HEIC/HEIF photo.",
    );
  try {
    if (type === "image/heic") {
      await homeworkHeicPreview(buffer);
    } else {
      const sharp = await homeworkImageEngine();
      const image = sharp(buffer, {
        limitInputPixels: MAX_HOMEWORK_PHOTO_PIXELS,
        failOn: "warning",
        animated: false,
      });
      const metadata = await image.metadata();
      checkDimensions(metadata.width ?? 0, metadata.height ?? 0);
      if (metadata.pages && metadata.pages > 1)
        throw new HomeworkUploadError(
          "IMAGE_ANIMATION",
          "Choose a single still photo, not an animated image.",
        );
      // Force a full decode; metadata alone does not detect truncated image data.
      await image
        .resize({ width: 1, height: 1, fit: "inside" })
        .raw()
        .toBuffer();
    }
    return type;
  } catch (error) {
    if (error instanceof HomeworkUploadError) throw error;
    throw new HomeworkUploadError(
      "IMAGE_INVALID",
      "This photo cannot be opened. Save it as JPG or retake it, then try again.",
    );
  }
}
/** HEIC remains private and unchanged in storage; browsers receive a JPEG preview. */
export async function homeworkHeicPreview(buffer: Buffer) {
  const sharp = await homeworkImageEngine();
  const { default: decode } = await import("heic-decode");
  const images = await decode.all({ buffer });
  try {
    const image = images[0];
    if (!image)
      throw new HomeworkUploadError(
        "IMAGE_INVALID",
        "The HEIC photo contains no image.",
      );
    checkDimensions(image.width, image.height);
    const decoded = await image.decode();
    return await sharp(Buffer.from(decoded.data), {
      raw: { width: decoded.width, height: decoded.height, channels: 4 },
    })
      .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
      .toBuffer();
  } finally {
    images.dispose();
  }
}
