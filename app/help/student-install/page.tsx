import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Student install handout",
  description: "Printable Bengali/English guide for adding the app to a phone home screen.",
};

/** Public printable handout for teachers — mirrors docs/PWA_STUDENT_INSTALL_HANDOUT.md */
export default function StudentInstallHandoutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          ← Back to login
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
        Phone-এ {APP_NAME} যোগ করুন
      </h1>
      <p className="mt-2 text-muted-foreground">
        Class handout — share the install link or QR from admin/teacher settings.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">কেন home screen-এ রাখবেন?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• এক ট্যাপে practice — browser tab খুঁজতে হবে না</p>
          <p>• Exam reminder — গুরুত্বপূর্ণ alert মিস কম হবে</p>
          <p>• অ্যাপের মতো দ্রুত খোলা যায়</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">iPhone (Safari)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Install link টি Safari-তে খুলুন (WhatsApp in-app browser নয়)।</p>
          <p>2. নিচে Share বাটন → Add to Home Screen।</p>
          <p>3. Add চাপুন। Home screen icon থেকে খুলুন।</p>
          <p className="pt-2 text-foreground">
            Push: install-এর পর Account → Browser push → On।
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Android (Chrome)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Install link Chrome-এ খুলুন।</p>
          <p>2. Install app prompt এলে Confirm করুন।</p>
          <p>3. না এলে menu (⋮) → Install app / Add to Home screen।</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Teacher — ২ মিনিটের script</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            “সবাই phone-এ practice app টি home screen-এ যোগ করবেন। Link বা QR দেখুন —
            Add to Home Screen করুন। Exam reminder চাইলে Account-এ Browser push চালু
            করুন।”
          </p>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        Students open the live guide after sign-in:{" "}
        <Link href="/student/help/install" className="text-primary hover:underline">
          /student/help/install
        </Link>
      </p>
    </main>
  );
}
