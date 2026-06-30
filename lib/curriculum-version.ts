// Curriculum version helpers — pure logic for tests.

/** Next monotonic version number for an institute. */
export function nextCurriculumVersionNumber(
  currentMax: number | null | undefined,
): number {
  return (currentMax ?? 0) + 1;
}

/** Human label for a curriculum version row. */
export function formatCurriculumVersionLabel(input: {
  versionNumber: number;
  label?: string | null;
}): string {
  const base = `Version ${input.versionNumber}`;
  const note = input.label?.trim();
  return note ? `${base} — ${note}` : base;
}
