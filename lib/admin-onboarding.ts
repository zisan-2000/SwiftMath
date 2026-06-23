// Admin onboarding checklist — pure step definitions (Phase 2.6).
//
// Maps institute headline counts to a ordered setup guide for a new tenant
// admin. Kept framework-agnostic for easy unit testing.

export interface AdminOnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

/** Counts the admin dashboard already loads for the institute. */
export interface AdminOnboardingCounts {
  teachers: number;
  groups: number;
  students: number;
  /** Finished practice attempts (any time window is fine for "has practice"). */
  practiceSessions: number;
}

/**
 * Build the getting-started checklist for an institute admin. Steps reflect
 * what admins and teachers actually do in the product (admin does not create
 * students or groups directly).
 */
export function buildAdminOnboardingSteps(
  counts: AdminOnboardingCounts,
): AdminOnboardingStep[] {
  return [
    {
      id: "teachers",
      label: "Add a teacher",
      description: "Create at least one teacher account so they can sign in.",
      href: "/admin/teachers",
      done: counts.teachers > 0,
    },
    {
      id: "groups",
      label: "Create a group",
      description:
        "Each teacher creates a class group from their Groups page.",
      href: "/admin/groups",
      done: counts.groups > 0,
    },
    {
      id: "students",
      label: "Add students",
      description:
        "Teachers add students to their group and assign a starting level.",
      href: "/admin/students",
      done: counts.students > 0,
    },
    {
      id: "practice",
      label: "First practice session",
      description:
        "Students sign in and complete a timed practice at their level.",
      href: "/admin/students",
      done: counts.practiceSessions > 0,
    },
  ];
}

/** True when every onboarding step is marked done. */
export function isAdminOnboardingComplete(steps: AdminOnboardingStep[]): boolean {
  return steps.every((step) => step.done);
}
