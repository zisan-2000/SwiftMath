"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import {
  buildStudentInstallHelpUrl,
  buildStudentInstallPromptUrl,
  buildWhatsAppShareUrl,
} from "@/lib/pwa-install-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShareInstallPanelProps {
  /** Public site origin, e.g. https://app.example.com */
  origin: string;
  appName: string;
  /** Link to the printable handout in the repo/docs (optional). */
  handoutHref?: string;
}

/** Admin/teacher card — copy link, WhatsApp template, QR for student install guide. */
export function ShareInstallPanel({
  origin,
  appName,
  handoutHref = "/docs/PWA_STUDENT_INSTALL_HANDOUT.md",
}: ShareInstallPanelProps) {
  const installUrl = buildStudentInstallHelpUrl(origin);
  const promptUrl = buildStudentInstallPromptUrl(origin);
  const whatsappUrl = buildWhatsAppShareUrl(installUrl, appName);

  const [copied, setCopied] = useState<"link" | "prompt" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!showQr) {
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(installUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error) => {
        console.error("[pwa] qr generation failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [installUrl, showQr]);

  async function copy(value: string, kind: "link" | "prompt") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4" aria-hidden />
          Share student app install
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Send this link so students can add {appName} to their phone home screen
          for faster practice and exam reminders.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Install guide link
          </p>
          <p className="mt-1 break-all text-sm text-foreground">{installUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(installUrl, "link")}
            >
              {copied === "link" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(promptUrl, "prompt")}
            >
              {copied === "prompt" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy with auto-prompt
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowQr((value) => !value)}
            >
              <QrCode className="h-4 w-4" />
              {showQr ? "Hide QR" : "Show QR"}
            </Button>
          </div>
        </div>

        {showQr ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
              <img
                src={qrDataUrl}
                alt={`QR code for ${installUrl}`}
                width={220}
                height={220}
                className="rounded-md border bg-white p-2"
              />
            ) : (
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                Generating QR…
              </div>
            )}
            <p className="max-w-sm text-sm text-muted-foreground">
              Print or project this QR in class. Students scan to open the install
              guide on their phone.
            </p>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Printable Bengali handout for class/WhatsApp:{" "}
          <Link href={handoutHref} className="text-primary hover:underline">
            Student install handout
          </Link>
          . Verbal script is included at the bottom of that document.
        </p>
      </CardContent>
    </Card>
  );
}
