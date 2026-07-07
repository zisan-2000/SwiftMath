"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createInstitute,
  setInstituteActive,
  updateInstitute,
} from "@/server/super";
import {
  notifySuperAdminsInstituteCreated,
  notifySuperAdminsInstituteDisabled,
  notifySuperAdminsInstituteEnabled,
} from "@/server/notifications";

/** Result of the add-institute form, surfaced via useActionState. */
export interface AddInstituteState {
  error?: string;
  ok?: boolean;
}

/** Result of the edit-institute form, surfaced via useActionState. */
export interface UpdateInstituteState {
  error?: string;
  ok?: boolean;
}

/**
 * Validate the shared institute identity + branding fields. Returns an error
 * string, or null when everything is valid.
 */
function validateInstituteFields(fields: {
  name: string;
  slug: string;
  tagline: string;
  logoUrl: string;
}): string | null {
  if (!fields.name) return "Institute name is required.";
  if (!/^[a-z0-9-]+$/.test(fields.slug)) {
    return "Slug may contain only lowercase letters, numbers, and hyphens.";
  }
  if (fields.tagline.length > 120) {
    return "Tagline must be 120 characters or fewer.";
  }
  if (fields.logoUrl && !isValidHttpUrl(fields.logoUrl)) {
    return "Logo URL must be a valid http(s) URL.";
  }
  return null;
}

/** True if `value` parses as an absolute http(s) URL. */
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Looks like a Prisma unique-constraint violation (slug or email taken)? */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Create a new institute plus its first ADMIN. Super-admin only. Validates the
 * slug shape (URL-safe) and the admin credentials before delegating to the
 * trusted `createInstitute`.
 */
export async function addInstituteAction(
  _prevState: AddInstituteState,
  formData: FormData,
): Promise<AddInstituteState> {
  const actor = await requirePermission(PERMISSIONS.INSTITUTE_CREATE);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");

  const fieldError = validateInstituteFields({ name, slug, tagline, logoUrl });
  if (fieldError) return { error: fieldError };
  if (!adminName) return { error: "Admin name is required." };
  if (!adminEmail.includes("@")) {
    return { error: "Enter a valid admin email address." };
  }
  if (adminPassword.length < 8) {
    return { error: "Admin password must be at least 8 characters." };
  }

  try {
    const institute = await createInstitute({
      name,
      slug,
      tagline,
      logoUrl,
      admin: { name: adminName, email: adminEmail, password: adminPassword },
    });
    await notifySuperAdminsInstituteCreated({
      actorUserId: actor.id,
      actorName: actor.name,
      instituteId: institute.id,
      instituteName: institute.name,
      instituteSlug: institute.slug,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That slug or admin email is already in use." };
    }
    throw error;
  }

  revalidatePath("/super/institutes");
  revalidatePath("/super");
  return { ok: true };
}

/**
 * Update an institute's identity + branding. `instituteId` is bound by the
 * page. Super-admin only.
 */
export async function updateInstituteAction(
  instituteId: string,
  _prevState: UpdateInstituteState,
  formData: FormData,
): Promise<UpdateInstituteState> {
  await requirePermission(PERMISSIONS.INSTITUTE_UPDATE);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  const fieldError = validateInstituteFields({ name, slug, tagline, logoUrl });
  if (fieldError) return { error: fieldError };

  try {
    const ok = await updateInstitute(instituteId, {
      name,
      slug,
      tagline,
      logoUrl,
    });
    if (!ok) return { error: "Institute not found." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That slug is already in use." };
    }
    throw error;
  }

  revalidateInstitutePaths(instituteId);
  return { ok: true };
}

/** Revalidate list + dashboard + institute workspace after edits. */
function revalidateInstitutePaths(instituteId: string) {
  revalidatePath("/super/institutes");
  revalidatePath(`/super/institutes/${instituteId}`, "layout");
  revalidatePath("/super");
}

/**
 * Enable or disable an institute. The id and target state are bound by the
 * page; `setInstituteActive` revokes member sessions when disabling.
 */
export async function setInstituteActiveAction(
  instituteId: string,
  isActive: boolean,
  _formData: FormData,
) {
  void _formData;
  const actor = await requirePermission(PERMISSIONS.INSTITUTE_TOGGLE_ACTIVE);

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, name: true },
  });
  if (!institute) return;

  const changed = await setInstituteActive(instituteId, isActive);
  if (!changed) return;

  if (isActive) {
    await notifySuperAdminsInstituteEnabled({
      actorUserId: actor.id,
      actorName: actor.name,
      instituteId: institute.id,
      instituteName: institute.name,
    });
  } else {
    await notifySuperAdminsInstituteDisabled({
      actorUserId: actor.id,
      actorName: actor.name,
      instituteId: institute.id,
      instituteName: institute.name,
    });
  }

  revalidateInstitutePaths(instituteId);
}
