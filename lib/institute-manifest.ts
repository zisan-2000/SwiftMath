import type { MetadataRoute } from "next";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { DEFAULT_PRIMARY_COLOR, normalizeHexColor } from "@/lib/institute-theme";
import { roleHomePath } from "@/lib/roles";
import { Role } from "@/lib/generated/prisma/enums";

/** Fields used to white-label the installable web app manifest. */
export interface InstituteManifestBrand {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

/** Allowed generated PWA icon sizes. */
export const INSTITUTE_ICON_SIZES = [180, 192, 512] as const;
export type InstituteIconSize = (typeof INSTITUTE_ICON_SIZES)[number];

export function isInstituteIconSize(value: string): value is `${InstituteIconSize}` {
  return (INSTITUTE_ICON_SIZES as readonly number[]).includes(Number(value));
}

/** Same-origin icon URL served by `/api/pwa/institute-icon/...`. */
export function instituteIconPath(instituteId: string, size: InstituteIconSize): string {
  return `/api/pwa/institute-icon/${encodeURIComponent(instituteId)}/${size}`;
}

export interface BuildWebAppManifestInput {
  /** Signed-in institute branding; null = platform defaults. */
  institute: InstituteManifestBrand | null;
  /** Start URL role home for signed-in users; ignored when anonymous. */
  role?: Role | null;
}

export const PLATFORM_MANIFEST_ICONS: MetadataRoute.Manifest["icons"] = [
  {
    src: "/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png",
  },
  {
    src: "/icons/icon-512.png",
    sizes: "512x512",
    type: "image/png",
  },
  {
    src: "/icons/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

/** Truncate institute name for `short_name` (home-screen label). */
export function shortManifestName(name: string, maxLength = 12): string {
  const trimmed = name.trim();
  if (!trimmed) return "SEFT";
  if (trimmed.length <= maxLength) return trimmed;

  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;
  if (firstWord.length <= maxLength) return firstWord;
  return firstWord.slice(0, maxLength);
}

/** Guess icon MIME type from a public logo URL. */
export function iconMimeFromUrl(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/png";
}

/**
 * Build installable web app manifest.
 *
 * Session-scoped institute branding (name / color / logo) applies only when an
 * institute member is signed in. Super Admin and anonymous visitors get the
 * platform defaults. Install branding is snapshotted at install time.
 */
export function buildWebAppManifest(
  input: BuildWebAppManifestInput = { institute: null },
): MetadataRoute.Manifest {
  const { institute, role = null } = input;
  const branded = Boolean(institute?.name.trim());

  const name = branded ? institute!.name.trim() : APP_NAME;
  const short_name = branded ? shortManifestName(institute!.name) : "SEFT";
  const description =
    (branded && institute!.tagline?.trim()) || APP_TAGLINE;
  const theme_color =
    (branded && normalizeHexColor(institute!.primaryColor ?? "")) ||
    DEFAULT_PRIMARY_COLOR;

  const start_url =
    role != null ? roleHomePath(role) : branded ? "/student" : "/login";

  const logoUrl = institute?.logoUrl?.trim() || null;
  const icons =
    branded && logoUrl && institute?.id
      ? buildInstituteIcons(institute.id)
      : PLATFORM_MANIFEST_ICONS;

  return {
    name,
    short_name,
    description,
    start_url,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f7fb",
    theme_color,
    categories: ["education", "productivity"],
    icons,
  };
}

function buildInstituteIcons(
  instituteId: string,
): MetadataRoute.Manifest["icons"] {
  return [
    {
      src: instituteIconPath(instituteId, 192),
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: instituteIconPath(instituteId, 512),
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: instituteIconPath(instituteId, 512),
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}
