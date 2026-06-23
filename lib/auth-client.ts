// Browser-side auth client.
//
// Used by client components to sign in/out and read the current session. The
// `inferAdditionalFields` plugin teaches the client about our custom user
// fields (`role`, `instituteId`) so they are typed on `useSession()` results.
//
// NOTE: the `import type` below is erased at build time, so importing from the
// server-only `@/lib/auth` here does NOT leak server code into the browser.

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, useSession, requestPasswordReset, resetPassword } =
  authClient;
