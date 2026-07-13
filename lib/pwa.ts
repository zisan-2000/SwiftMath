export const SERVICE_WORKER_PATH = "/serwist/sw.js";

/** @deprecated Migrated to {@link PWA_INSTALL_STATE_KEY}. */
export const PWA_INSTALL_DISMISSED_KEY = "swiftmath:pwa-install-dismissed";

export const PWA_INSTALL_STATE_KEY = "swiftmath:pwa-install-state";
export const PWA_INSTALL_SESSION_KEY = "swiftmath:pwa-install-session-counted";

/** Auto-prompt snooze duration (7 days). */
export const PWA_INSTALL_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Stop auto-prompting after this many impressions. */
export const PWA_INSTALL_MAX_AUTO_SHOWS = 3;

/** Minimum student visits before the first auto-prompt. */
export const PWA_INSTALL_MIN_VISITS = 2;

export type PwaInstallPlatform =
  | "android"
  | "ios-safari"
  | "ios-non-safari"
  | "ios-in-app"
  | "desktop"
  | "unknown";

export interface PwaInstallState {
  dismissedUntil: number | null;
  permanent: boolean;
  shownCount: number;
  visitCount: number;
  installedAt: number | null;
  firstPracticeAt: number | null;
}

export function createDefaultInstallState(): PwaInstallState {
  return {
    dismissedUntil: null,
    permanent: false,
    shownCount: 0,
    visitCount: 0,
    installedAt: null,
    firstPracticeAt: null,
  };
}

export function shouldRegisterServiceWorker(): boolean {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    return false;
  }

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
  return detectInstallPlatform(userAgent) === "ios-safari";
}

export function isInAppBrowser(userAgent: string): boolean {
  const normalized = userAgent.toLowerCase();
  return (
    /(fbav|fban|instagram|line\/|twitter|whatsapp)/.test(normalized) ||
    (/(iphone|ipad|ipod)/.test(normalized) &&
      !/safari/.test(normalized) &&
      !/crios|fxios|edgios/.test(normalized))
  );
}

export function isMobileUserAgent(userAgent: string): boolean {
  const normalized = userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(normalized);
}

/** Classify the browser for install instructions. */
export function detectInstallPlatform(userAgent: string): PwaInstallPlatform {
  const normalized = userAgent.toLowerCase();

  if (isInAppBrowser(userAgent)) {
    return "ios-in-app";
  }

  if (/android/.test(normalized)) {
    return "android";
  }

  const isAppleMobile = /iphone|ipad|ipod/.test(normalized);
  if (isAppleMobile) {
    const isSafari =
      /safari/.test(normalized) && !/crios|fxios|edgios|edg\//.test(normalized);
    return isSafari ? "ios-safari" : "ios-non-safari";
  }

  if (isMobileUserAgent(userAgent)) {
    return "unknown";
  }

  return "desktop";
}

export function readInstallState(): PwaInstallState {
  if (typeof window === "undefined") {
    return createDefaultInstallState();
  }

  const raw = window.localStorage.getItem(PWA_INSTALL_STATE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PwaInstallState>;
      return {
        ...createDefaultInstallState(),
        ...parsed,
      };
    } catch {
      return createDefaultInstallState();
    }
  }

  if (window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "1") {
    return { ...createDefaultInstallState(), permanent: true };
  }

  return createDefaultInstallState();
}

export function writeInstallState(state: PwaInstallState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PWA_INSTALL_STATE_KEY, JSON.stringify(state));
  window.localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
}

export function recordStudentVisit(): PwaInstallState {
  const state = readInstallState();

  if (typeof window === "undefined") {
    return state;
  }

  if (window.sessionStorage.getItem(PWA_INSTALL_SESSION_KEY) === "1") {
    return state;
  }

  window.sessionStorage.setItem(PWA_INSTALL_SESSION_KEY, "1");
  const next = { ...state, visitCount: state.visitCount + 1 };
  writeInstallState(next);
  return next;
}

export function markFirstPracticeCompleted(): void {
  const state = readInstallState();
  if (state.firstPracticeAt) {
    return;
  }

  writeInstallState({ ...state, firstPracticeAt: Date.now() });
}

export function snoozeInstallPrompt(): PwaInstallState {
  const state = readInstallState();
  const next = {
    ...state,
    dismissedUntil: Date.now() + PWA_INSTALL_SNOOZE_MS,
  };
  writeInstallState(next);
  return next;
}

export function permanentlyDismissInstallPrompt(): PwaInstallState {
  const state = readInstallState();
  const next = {
    ...state,
    permanent: true,
    dismissedUntil: null,
  };
  writeInstallState(next);
  return next;
}

export function recordInstallPromptShown(): PwaInstallState {
  const state = readInstallState();
  const next = {
    ...state,
    shownCount: state.shownCount + 1,
  };
  writeInstallState(next);
  return next;
}

export function markInstallCompleted(): PwaInstallState {
  const state = readInstallState();
  const next = {
    ...state,
    installedAt: Date.now(),
    permanent: true,
  };
  writeInstallState(next);
  return next;
}

export function shouldAutoShowInstallPrompt(
  state: PwaInstallState,
  options?: { force?: boolean },
): boolean {
  if (options?.force) {
    return true;
  }

  if (state.permanent || state.installedAt) {
    return false;
  }

  if (state.dismissedUntil && Date.now() < state.dismissedUntil) {
    return false;
  }

  if (state.shownCount >= PWA_INSTALL_MAX_AUTO_SHOWS) {
    return false;
  }

  const engaged =
    state.visitCount >= PWA_INSTALL_MIN_VISITS || state.firstPracticeAt !== null;

  return engaged;
}

/** iOS Web Push only works from an installed home-screen app. */
export function isIosPushInstallRequired(userAgent: string): boolean {
  if (isStandaloneDisplay()) {
    return false;
  }

  return /iphone|ipad|ipod/i.test(userAgent);
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
