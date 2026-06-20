// better-auth HTTP endpoints.
//
// This single catch-all route exposes every better-auth endpoint under
// /api/auth/* (sign-in, sign-out, get-session, etc.). The browser auth client
// in `lib/auth-client.ts` talks to these.

import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
