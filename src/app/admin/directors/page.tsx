import { requirePageUser } from "@/lib/auth/guards";
import { DirectorManager } from "@/components/admin/director-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "পরিচালক ব্যবস্থাপনা" };

export default async function AdminDirectorsPage() {
  await requirePageUser(["ADMIN"]);
  return <DirectorManager />;
}
