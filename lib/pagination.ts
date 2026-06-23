// Pagination helpers — framework-agnostic parsing and bounds math.

/** Default page size for admin roster lists. */
export const DEFAULT_PAGE_SIZE = 25;

/** Hard cap to avoid accidental huge queries. */
export const MAX_PAGE_SIZE = 100;

/** A page of rows plus metadata for navigation UI. */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Parse `?page=` from the URL; invalid values fall back to page 1. */
export function parsePageParam(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

/** Clamp page size into the allowed range. */
export function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
}

/** Prisma `skip` / `take` for a 1-based page index. */
export function paginationBounds(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): { skip: number; take: number; page: number; pageSize: number } {
  const safeSize = clampPageSize(pageSize);
  const safePage = Math.max(1, parsePageParam(String(page)));
  return {
    skip: (safePage - 1) * safeSize,
    take: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}

/** Total pages for a row count (minimum 1 so empty lists still have page 1). */
export function computeTotalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / clampPageSize(pageSize));
}

/** Build a paginated result object from query outputs. */
export function buildPaginatedList<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedList<T> {
  const safeSize = clampPageSize(pageSize);
  const safePage = Math.max(1, page);
  return {
    items,
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: computeTotalPages(total, safeSize),
  };
}

/** First index (1-based) of the current page within the total row count. */
export function pageRangeStart(page: number, pageSize: number): number {
  if (page <= 1) return 1;
  return (page - 1) * pageSize + 1;
}

/** Last index (1-based) of the current page within the total row count. */
export function pageRangeEnd(page: number, pageSize: number, total: number): number {
  return Math.min(total, page * pageSize);
}
