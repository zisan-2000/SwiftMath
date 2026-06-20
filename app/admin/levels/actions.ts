"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/session";
import { Role, OperationType } from "@/lib/generated/prisma/enums";
import { createLevel, updateLevel, type LevelInput } from "@/server/admin";

/** Result of a level create/edit form, surfaced via useActionState. */
export interface LevelFormState {
  error?: string;
  ok?: boolean;
}

/** Looks like a Prisma unique-constraint violation (duplicate orderIndex)? */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Parse a required integer field from the form, or return null if invalid. */
function intField(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

/**
 * Validate + normalise the level fields shared by create and edit. Returns
 * either a typed LevelInput or a user-facing error string.
 */
function parseLevelInput(
  formData: FormData,
): { input: LevelInput } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const operationRaw = String(formData.get("operation") ?? "");
  const isOperation = (Object.values(OperationType) as string[]).includes(
    operationRaw,
  );
  if (!isOperation) return { error: "Choose a valid operation." };
  const operation = operationRaw as OperationType;

  const orderIndex = intField(formData, "orderIndex");
  const termsPerQuestion = intField(formData, "termsPerQuestion");
  const minNumber = intField(formData, "minNumber");
  const maxNumber = intField(formData, "maxNumber");
  const questionCount = intField(formData, "questionCount");
  const timeLimitSeconds = intField(formData, "timeLimitSeconds");
  const passAccuracy = intField(formData, "passAccuracy");

  if (
    orderIndex === null ||
    termsPerQuestion === null ||
    minNumber === null ||
    maxNumber === null ||
    questionCount === null ||
    timeLimitSeconds === null ||
    passAccuracy === null
  ) {
    return { error: "All numeric fields must be whole numbers." };
  }

  if (orderIndex < 1) return { error: "Order must be 1 or greater." };
  if (termsPerQuestion < 2) {
    return { error: "Terms per question must be at least 2." };
  }
  if (maxNumber < minNumber) {
    return { error: "Max number cannot be less than min number." };
  }
  if (questionCount < 1) return { error: "Question count must be at least 1." };
  if (timeLimitSeconds < 1) return { error: "Time limit must be at least 1s." };
  if (passAccuracy < 0 || passAccuracy > 100) {
    return { error: "Pass accuracy must be between 0 and 100." };
  }

  return {
    input: {
      name,
      operation,
      orderIndex,
      termsPerQuestion,
      minNumber,
      maxNumber,
      questionCount,
      timeLimitSeconds,
      passAccuracy,
    },
  };
}

/** Create a level in the signed-in admin's institute, then return to the list. */
export async function createLevelAction(
  _prevState: LevelFormState,
  formData: FormData,
): Promise<LevelFormState> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = parseLevelInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await createLevel(admin, parsed.input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That order position is already used by another level." };
    }
    throw error;
  }

  revalidatePath("/admin/levels");
  redirect("/admin/levels");
}

/** Update an existing level the admin owns. */
export async function updateLevelAction(
  levelId: string,
  _prevState: LevelFormState,
  formData: FormData,
): Promise<LevelFormState> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = parseLevelInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  let changed: number;
  try {
    changed = await updateLevel(admin, levelId, parsed.input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That order position is already used by another level." };
    }
    throw error;
  }

  if (changed === 0) {
    return { error: "Level not found in your institute." };
  }

  revalidatePath("/admin/levels");
  revalidatePath(`/admin/levels/${levelId}`);
  return { ok: true };
}
