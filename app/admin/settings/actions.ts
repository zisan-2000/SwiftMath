"use server";

import { revalidatePath } from "next/cache";

import {
  normalizeInstitutePrimaryColor,
  validateInstituteBranding,
} from "@/lib/institute-branding";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { updateInstituteBranding } from "@/server/admin";
import { uploadInstituteLogo } from "@/server/institute-logo";
import { bumpCurriculumVersion } from "@/server/curriculum-version";

/** Result of the institute settings form, surfaced via useActionState. */
export interface UpdateInstituteSettingsState {
  error?: string;
  ok?: boolean;
}

export interface BumpCurriculumVersionState {
  error?: string;
  ok?: boolean;
  versionNumber?: number;
  label?: string | null;
}

/** Update white-label branding for the signed-in admin's institute. */
export async function updateInstituteSettingsAction(
  _prevState: UpdateInstituteSettingsState,
  formData: FormData,
): Promise<UpdateInstituteSettingsState> {
  const admin = await requireRole(Role.ADMIN);

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const primaryColorRaw = String(formData.get("primaryColor") ?? "").trim();
  let logoUrl = String(formData.get("logoUrl") ?? "").trim();

  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    const upload = await uploadInstituteLogo(admin, logoFile);
    if ("error" in upload) return { error: upload.error };
    logoUrl = upload.url;
  }

  const fieldError = validateInstituteBranding({
    name,
    tagline,
    logoUrl,
    primaryColor: primaryColorRaw,
  });
  if (fieldError) return { error: fieldError };

  const ok = await updateInstituteBranding(admin, {
    name,
    tagline,
    logoUrl,
    primaryColor: normalizeInstitutePrimaryColor(primaryColorRaw),
  });
  if (!ok) return { error: "Institute not found." };

  revalidateInstituteBrandingPaths();

  return { ok: true };
}

/** Start a new active curriculum generation for the institute. */
export async function bumpCurriculumVersionAction(
  formData: FormData,
): Promise<BumpCurriculumVersionState> {
  const admin = await requireRole(Role.ADMIN);
  const label = String(formData.get("label") ?? "");

  const result = await bumpCurriculumVersion(admin, label);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateCurriculumVersionPaths();
  return {
    ok: true,
    versionNumber: result.version.versionNumber,
    label: result.version.label,
  };
}

function revalidateCurriculumVersionPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/levels", "layout");
  revalidatePath("/teacher", "layout");
}

function revalidateInstituteBrandingPaths() {
  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/account");
}
