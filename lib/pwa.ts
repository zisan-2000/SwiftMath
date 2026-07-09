export const SERVICE_WORKER_PATH = "/serwist/sw.js";
export const PWA_INSTALL_DISMISSED_KEY = "swiftmath:pwa-install-dismissed";

export function shouldRegisterServiceWorker(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    (process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === "1")
  );
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean(navigator.standalone))
  );
}

export function isIosInstallCandidate(userAgent: string): boolean {
  const normalized = userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(normalized);
  const isSafari = /safari/.test(normalized) && !/crios|fxios|edgios/.test(normalized);
  return isAppleMobile && isSafari;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window === "undefined"
      ? Buffer.from(base64, "base64").toString("binary")
      : window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}
