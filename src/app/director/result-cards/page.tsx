import { requirePageUser } from "@/lib/auth/guards";
import { AdminResultCardView } from "@/components/admin/admin-result-card-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "রেজাল্ট কার্ড" };

export default async function DirectorResultCardsPage() {
  await requirePageUser(["DIRECTOR", "ADMIN"]);
  return (
    <div className="space-y-4">
      <AdminResultCardView />
    </div>
  );
}
