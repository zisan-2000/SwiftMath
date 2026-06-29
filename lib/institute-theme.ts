// Per-institute primary color → CSS custom properties for white-label theming.

/** Platform default when an institute has no custom primary color. */
export const DEFAULT_PRIMARY_COLOR = "#4F46E5";

/** CSS variables overridden when an institute sets a custom primary color. */
export function buildInstituteThemeVariables(
  primaryColor: string | null | undefined,
): Record<string, string> | null {
  const hex = normalizeHexColor(primaryColor ?? "");
  if (!hex) return null;

  const foreground = primaryForeground(hex);
  return {
    "--primary": hex,
    "--primary-foreground": foreground,
    "--sidebar-primary": hex,
    "--sidebar-primary-foreground": foreground,
  };
}

/** Normalize `#RRGGBB` (or `RRGGBB`) to uppercase hex with leading `#`. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (!match) return null;
  return `#${match[1]!.toUpperCase()}`;
}

/** Validate optional primary color input. Empty means platform default. */
export function validatePrimaryColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!normalizeHexColor(trimmed)) {
    return "Primary color must be a hex value like #4F46E5.";
  }
  return null;
}

/** Pick light or dark text for readable contrast on a solid primary background. */
export function primaryForeground(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);
  return luminance > 0.55 ? "#0A0A0A" : "#FAFAFA";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return { r: 0, g: 0, b: 0 };
  const raw = normalized.slice(1);
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
