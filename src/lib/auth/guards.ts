// Route guards for pages (redirect based) and API routes (typed errors).

import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";
import { getDb } from "@/lib/db";
import type { Role } from "@/lib/constants";
import { ApiError } from "@/lib/api";
import type { D1Database } from "@/lib/db/types";

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "DIRECTOR":
      return "/director/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    default:
      return "/student/dashboard";
  }
}

/** Page guard: redirects to /login (or the role home) as appropriate. */
export async function requirePageUser(roles?: Role[]): Promise<CurrentUser> {
  const db = await getDb();
  const user = await getCurrentUser(db);
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

/** API guard: throws 401/403. */
export async function requireApiUser(roles?: Role[]): Promise<{ user: CurrentUser; db: D1Database }> {
  const db = await getDb();
  const user = await getCurrentUser(db);
  if (!user) throw new ApiError(401, "লগইন করা আবশ্যক।");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "আপনার এই তথ্য দেখার অনুমতি নেই।");
  return { user, db };
}
