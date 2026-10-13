import Image from "next/image";

import { cn } from "@/lib/utils";

const PLATFORM_LOGOS = {
  full: {
    src: "/branding/seft-abacus-logo.png",
    width: 1656,
    height: 398,
  },
  mark: {
    src: "/branding/seft-mark-wide.png",
    width: 740,
    height: 420,
  },
} as const;

/** Exact SEFT artwork supplied by the client, optimized for its display size. */
export function PlatformLogo({
  variant = "full",
  alt = "SEFT Abacus — Smart Brain Development Program",
  className,
  preload = false,
  sizes,
}: {
  variant?: keyof typeof PLATFORM_LOGOS;
  alt?: string;
  className?: string;
  preload?: boolean;
  sizes?: string;
}) {
  const logo = PLATFORM_LOGOS[variant];

  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt={alt}
      preload={preload}
      sizes={sizes ?? (variant === "full" ? "(max-width: 768px) 92vw, 896px" : "40px")}
      className={cn("object-contain", className)}
    />
  );
}
