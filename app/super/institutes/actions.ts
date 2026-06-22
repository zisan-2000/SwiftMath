"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/session";
import { createInstitute, setInstituteActive } from "@/server/super";

/** Result of the add-institute form, surfaced via useActionState. */
export interface AddInstituteState {
  error?: string;
  ok?: boolean;
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
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");

  if (!name) return { error: "Institute name is required." };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      error: "Slug may contain only lowercase letters, numbers, and hyphens.",
    };
  }
  if (!adminName) return { error: "Admin name is required." };
  if (!adminEmail.includes("@")) {
    return { error: "Enter a valid admin email address." };
  }
  if (adminPassword.length < 8) {
    return { error: "Admin password must be at least 8 characters." };
  }

  try {
    await createInstitute({
      name,
      slug,
      admin: { name: adminName, email: adminEmail, password: adminPassword },
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
 * Enable or disable an institute. The id and target state are bound by the
 * page; `setInstituteActive` revokes member sessions when disabling.
 */
export async function setInstituteActiveAction(
  instituteId: string,
  isActive: boolean,
  _formData: FormData,
) {
  await requireSuperAdmin();

  await setInstituteActive(instituteId, isActive);

  revalidatePath("/super/institutes");
  revalidatePath("/super");
}
