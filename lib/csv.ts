/** Escape a single CSV cell per RFC 4180. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build a CSV string from headers and row values. */
export function rowsToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  // BOM helps Excel open UTF-8 exports with non-ASCII names correctly.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Slug for Content-Disposition filenames (lowercase, safe characters). */
export function slugifyFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "institute";
}
