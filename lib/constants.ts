/**
 * Application-wide constants.
 *
 * Keep values that are *brand* or *product* level here (things that are the
 * same across every institute). Per-institute, configurable values do NOT
 * belong here — those will live in the database (the `Institute` table) so
 * each white-labelled instance can override them.
 */

/** Platform brand name shown in the UI and document title. */
export const APP_NAME = "SEFT Abacus";

/** One-line product description used on the landing page and metadata. */
export const APP_TAGLINE =
  "Timed mental-math and abacus practice for institutes, teachers, and students.";

/**
 * Slug of the single institute that is active in Phase 1.
 *
 * The whole system is multi-institute from day one (every record carries an
 * `instituteId`), but only SEFT is live right now. We reference this slug when
 * seeding and when we need a sensible default institute. Additional institutes
 * are an Admin/Phase-2 concern.
 */
export const DEFAULT_INSTITUTE_SLUG = "seft";
