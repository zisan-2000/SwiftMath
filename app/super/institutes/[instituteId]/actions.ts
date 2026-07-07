"use server";

import { revalidatePath } from "next/cache";

import { PermissionEffect } from "@/lib/generated/prisma/enums";
import type { ResetPasswordState } from "@/components/reset-password-form";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createInstituteAdmin,
  resetInstituteAdminPassword,
  setInstituteAdminActive,
} from "@/server/super";
import { setInstituteAdminPermissionOverride } from "@/server/user-permissions";

/** Revalidate every Super Admin view that shows institute data. */
function revalidateInstituteViews(instituteId: string) {
  revalidatePath("/super/institutes");
  revalidatePath(`/super/institutes/${instituteId}`, "layout");
  revalidatePath("/super");
}

export interface CreateInstituteAdminState {
  error?: string;
  ok?: boolean;
}

export interface SetInstituteAdminActiveState {
  error?: string;
  ok?: boolean;
}

export interface SetInstituteAdminPermissionState {
  error?: string;
  ok?: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function createInstituteAdminAction(
  instituteId: string,
  _prevState: CreateInstituteAdminState,
  formData: FormData,
): Promise<CreateInstituteAdminState> {
  await requirePermission(PERMISSIONS.ADMIN_CREATE);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Admin name is required." };
  if (!email.includes("@")) {
    return { error: "Enter a valid admin email address." };
  }
  if (password.length < 8) {
    return { error: "Admin password must be at least 8 characters." };
  }

  try {
    const result = await createInstituteAdmin(instituteId, {
      name,
      email,
      password,
    });
    if (!result.ok) return { error: result.error };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That email is already in use." };
    }
    throw error;
  }

  revalidateInstituteViews(instituteId);
  return { ok: true };
}

export async function setInstituteAdminActiveAction(
  instituteId: string,
  userId: string,
  isActive: boolean,
  _prevState: SetInstituteAdminActiveState,
  _formData: FormData,
): Promise<SetInstituteAdminActiveState> {
  void _prevState;
  void _formData;

  await requirePermission(PERMISSIONS.ADMIN_DISABLE);

  const result = await setInstituteAdminActive(instituteId, userId, isActive);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateInstituteViews(instituteId);
  return { ok: true };
}

export async function setInstituteAdminPermissionAction(
  instituteId: string,
  adminId: string,
  _prevState: SetInstituteAdminPermissionState,
  formData: FormData,
): Promise<SetInstituteAdminPermissionState> {
  const superAdmin = await requirePermission(PERMISSIONS.ADMIN_PERMISSIONS_MANAGE);

  const permission = String(formData.get("permission") ?? "");
  const effectValue = String(formData.get("effect") ?? "DEFAULT");
  const effect =
    effectValue === "DEFAULT"
      ? null
      : effectValue === PermissionEffect.ALLOW ||
          effectValue === PermissionEffect.DENY
        ? effectValue
        : undefined;

  if (effect === undefined) {
    return { error: "Choose a valid permission override." };
  }

  const result = await setInstituteAdminPermissionOverride(
    superAdmin,
    instituteId,
    adminId,
    permission,
    effect,
  );
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/activity");
  revalidateInstituteViews(instituteId);
  return { ok: true };
}

/**
 * Reset an institute ADMIN's password. The institute and user ids are bound by
 * the page; `resetInstituteAdminPassword` verifies the target is an ADMIN in
 * that tenant before delegating to the trusted password primitive.
 */
export async function resetInstituteAdminPasswordAction(
  instituteId: string,
  userId: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requirePermission(PERMISSIONS.ADMIN_RESET_PASSWORD);

  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "Passwords do not match." };
  }

  const ok = await resetInstituteAdminPassword(instituteId, userId, next);
  if (!ok) {
    return { error: "Admin not found in this institute." };
  }

  revalidateInstituteViews(instituteId);
  return { ok: true };
}
