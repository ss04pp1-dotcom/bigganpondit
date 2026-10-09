// Root entry: send the user to the right dashboard (or login).

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/guards";
import LoginPage from "./(auth)/login/page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jar = await cookies();
  if (!jar.get("sid")) {
    return <LoginPage />;
  }
  const db = await getDb();
  const user = await getCurrentUser(db);
  if (!user) {
    return <LoginPage />;
  }
  redirect(roleHome(user.role));
}
