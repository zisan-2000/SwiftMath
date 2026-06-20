import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";

/**
 * Routing hub. Every signed-in user lands here (after login, or via the proxy)
 * and is forwarded to the dashboard for their role. requireRole() in the role
 * pages also redirects mismatched users back through here, so this is the one
 * place that knows the role → home mapping.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  redirect(roleHomePath(user.role));
}
