// Default practice curriculum for a brand-new institute.
//
// Shared by the seed script (SEFT demo) and `createInstitute` (Phase 2.2) so
// every tenant starts with the same starter ADD/SUB/MIXED progression. Admins
// can edit or extend these via the normal /admin/levels UI.

import { OperationType } from "@/lib/generated/prisma/enums";

/** Shape of a level row minus `instituteId` (added at insert time). */
export interface DefaultLevelDef {
  orderIndex: number;
  name: string;
  operation: OperationType;
  termsPerQuestion: number;
  minNumber: number;
  maxNumber: number;
  questionCount: number;
  timeLimitSeconds: number;
  passAccuracy: number;
}

/**
 * Five-level starter curriculum — mirrors the SEFT seed progression. Keeps
 * new institutes usable on day one (teachers can assign level 1 to students
 * without the admin having to build a curriculum first).
 */
export const DEFAULT_STARTER_LEVELS: DefaultLevelDef[] = [
  {
    orderIndex: 1,
    name: "Addition I",
    operation: OperationType.ADDITION,
    termsPerQuestion: 2,
    minNumber: 1,
    maxNumber: 9,
    questionCount: 10,
    timeLimitSeconds: 120,
    passAccuracy: 70,
  },
  {
    orderIndex: 2,
    name: "Addition II",
    operation: OperationType.ADDITION,
    termsPerQuestion: 3,
    minNumber: 1,
    maxNumber: 9,
    questionCount: 10,
    timeLimitSeconds: 120,
    passAccuracy: 75,
  },
  {
    orderIndex: 3,
    name: "Addition III",
    operation: OperationType.ADDITION,
    termsPerQuestion: 3,
    minNumber: 10,
    maxNumber: 99,
    questionCount: 10,
    timeLimitSeconds: 180,
    passAccuracy: 75,
  },
  {
    orderIndex: 4,
    name: "Subtraction I",
    operation: OperationType.SUBTRACTION,
    termsPerQuestion: 2,
    minNumber: 1,
    maxNumber: 20,
    questionCount: 10,
    timeLimitSeconds: 120,
    passAccuracy: 70,
  },
  {
    orderIndex: 5,
    name: "Mixed I",
    operation: OperationType.MIXED,
    termsPerQuestion: 3,
    minNumber: 1,
    maxNumber: 20,
    questionCount: 10,
    timeLimitSeconds: 180,
    passAccuracy: 70,
  },
];
