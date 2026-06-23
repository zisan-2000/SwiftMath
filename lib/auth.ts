// better-auth server instance — the single auth configuration for the app.
//
// Key Phase 1 decisions encoded here:
//  - Email + password sign-in only.
//  - NO public self-service sign-up. Students and teachers are created by
//    trusted server code (see `server/users.ts`), which is the only place that
//    sets a user's `role` and `instituteId`. This stops anyone from registering
//    themselves or picking their own role/institute.
//  - `role` and `instituteId` are declared as additional user fields so that
//    better-auth selects them and includes them in the session — that is what
//    makes route protection and data scoping easy everywhere else.
//
// Secret/base URL come from the environment automatically:
//   BETTER_AUTH_SECRET, BETTER_AUTH_URL  (see .env / .env.example).

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { Role } from "@/lib/generated/prisma/enums";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    // Public sign-up is closed; accounts are provisioned server-side.
    disableSignUp: true,
    // Self-service forgot password (Phase 2.4). Requires `sendResetPassword`;
    // without it better-auth rejects `/request-password-reset`.
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: url,
      });
    },
    // Sign the user out everywhere once they set a new password.
    revokeSessionsOnPasswordReset: true,
  },

  user: {
    additionalFields: {
      // Stored in the `role` enum column. Always included in the session user.
      role: {
        type: "string",
        required: true,
        input: false, // clients can never set this; only trusted server code can
        defaultValue: Role.STUDENT,
      },
      // The institute every user belongs to. Always included in the session.
      instituteId: {
        type: "string",
        required: true,
        input: false,
      },
    },
  },

  // nextCookies must be the last plugin so it can persist auth cookies that are
  // set while handling Next.js server actions.
  plugins: [nextCookies()],
});

/** Full session shape ({ session, user }) inferred from the config above. */
export type AuthSession = typeof auth.$Infer.Session;
