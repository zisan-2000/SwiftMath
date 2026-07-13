/** Lightweight client events so install UI and update toasts do not compete. */

export const PWA_INSTALL_OPEN_EVENT = "swiftmath:pwa-install-open";
export const PWA_INSTALL_CLOSE_EVENT = "swiftmath:pwa-install-close";

export function notifyInstallPromptOpen(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PWA_INSTALL_OPEN_EVENT));
}

export function notifyInstallPromptClose(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PWA_INSTALL_CLOSE_EVENT));
}

export function subscribeInstallPromptVisibility(
  listener: (open: boolean) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onOpen = () => listener(true);
  const onClose = () => listener(false);

  window.addEventListener(PWA_INSTALL_OPEN_EVENT, onOpen);
  window.addEventListener(PWA_INSTALL_CLOSE_EVENT, onClose);

  return () => {
    window.removeEventListener(PWA_INSTALL_OPEN_EVENT, onOpen);
    window.removeEventListener(PWA_INSTALL_CLOSE_EVENT, onClose);
  };
}
