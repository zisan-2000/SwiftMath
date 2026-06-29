// Shared validation for institute white-label fields (name, tagline, logo).

import { validatePrimaryColor, normalizeHexColor } from "@/lib/institute-theme";

export interface InstituteBrandingInput {
  name: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
}

/** White-label fields shown on the institute admin settings page. */
export interface InstituteBrandingSettings {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

/** True if `value` parses as an absolute http(s) URL. */
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate branding fields an institute admin may edit. Returns an error
 * message, or null when valid.
 */
export function validateInstituteBranding(
  fields: InstituteBrandingInput,
): string | null {
  if (!fields.name.trim()) return "Institute name is required.";
  if (fields.tagline.length > 120) {
    return "Tagline must be 120 characters or fewer.";
  }
  if (fields.logoUrl && !isValidHttpUrl(fields.logoUrl)) {
    return "Logo URL must be a valid http(s) URL.";
  }
  const colorError = validatePrimaryColor(fields.primaryColor);
  if (colorError) return colorError;
  return null;
}

/** Normalize branding color for storage (null = platform default). */
export function normalizeInstitutePrimaryColor(value: string): string | null {
  return normalizeHexColor(value);
}
