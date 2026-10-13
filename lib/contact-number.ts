const CONTACT_NUMBER_PATTERN = /^\+?\d{6,20}$/;
const CONTACT_NUMBER_SEPARATORS = /[\s().-]+/g;

export type ContactNumberParseResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Validate and compact a staff-entered contact number for consistent display
 * and substring search. Empty input intentionally clears the optional field.
 */
export function parseContactNumber(input: string): ContactNumberParseResult {
  const compact = input.trim().replace(CONTACT_NUMBER_SEPARATORS, "");
  if (!compact) return { ok: true, value: null };

  if (!CONTACT_NUMBER_PATTERN.test(compact)) {
    return {
      ok: false,
      error: "Enter a valid contact number with 6–20 digits.",
    };
  }

  return { ok: true, value: compact };
}

/** Digits-only search token, so spaces/dashes in a query do not affect matching. */
export function contactNumberSearchToken(input: string): string {
  return input.replace(/\D/g, "");
}
