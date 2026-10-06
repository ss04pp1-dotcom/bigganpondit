import { requirePageUser } from "@/lib/auth/guards";
import { ResultsManager } from "@/components/admin/results-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "ফলাফল" };

export default async function AdminResultsPage() {
  await requirePageUser(["ADMIN"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">ফলাফল ব্যবস্থাপনা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          পরীক্ষা খুঁজুন, নম্বর সংশোধন করুন বা মুছে ফেলুন।
        </p>
      </div>
      <ResultsManager />
    </div>
  );
}
