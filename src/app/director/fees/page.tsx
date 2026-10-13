import { requirePageUser } from "@/lib/auth/guards";
import { AdminFeesManager } from "@/components/admin/admin-fees-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "ফি ও বকেয়া ব্যবস্থাপনা" };

export default async function DirectorFeesPage() {
  await requirePageUser(["DIRECTOR"]);
  return <AdminFeesManager />;
}
