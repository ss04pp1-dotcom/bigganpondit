// Root entry: send the user to the right dashboard (or login).

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const user = await getCurrentUser(db);
  if (!user) redirect("/login");
  redirect(roleHome(user.role));
}
