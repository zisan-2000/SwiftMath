"use server";

import { revalidatePath } from "next/cache";

import {
  validateInstituteBranding,
  type InstituteBrandingSettings,
} from "@/lib/institute-branding";
import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { updateInstituteBranding } from "@/server/admin";
import { uploadInstituteLogo } from "@/server/institute-logo";

/** Result of the institute settings form, surfaced via useActionState. */
export interface UpdateInstituteSettingsState {
  error?: string;
  ok?: boolean;
}

/** Update white-label branding for the signed-in admin's institute. */
export async function updateInstituteSettingsAction(
  _prevState: UpdateInstituteSettingsState,
  formData: FormData,
): Promise<UpdateInstituteSettingsState> {
  const admin = await requireRole(Role.ADMIN);

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  let logoUrl = String(formData.get("logoUrl") ?? "").trim();

  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    const upload = await uploadInstituteLogo(admin, logoFile);
    if ("error" in upload) return { error: upload.error };
    logoUrl = upload.url;
  }

  const fieldError = validateInstituteBranding({ name, tagline, logoUrl });
  if (fieldError) return { error: fieldError };

  const ok = await updateInstituteBranding(admin, { name, tagline, logoUrl });
  if (!ok) return { error: "Institute not found." };

  revalidateInstituteBrandingPaths();

  return { ok: true };
}

function revalidateInstituteBrandingPaths() {
  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/account");
}
