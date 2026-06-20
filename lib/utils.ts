// Shared UI utility: merge conditional class names while letting later Tailwind
// classes win over earlier conflicting ones. Used by every UI component.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
