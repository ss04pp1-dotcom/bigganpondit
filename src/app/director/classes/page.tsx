import { requirePageUser } from "@/lib/auth/guards";
import { ClassBatchManager } from "@/components/admin/class-batch-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "শ্রেণি ও ব্যাচ পরিদর্শক" };

export default async function DirectorClassesPage() {
  await requirePageUser(["DIRECTOR"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">শ্রেণি ও ব্যাচ পরিদর্শক</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          অ্যাকাডেমির সকল সচল শ্রেণি, ব্যাচ ও শিক্ষার্থীদের সংখ্যা পর্যবেক্ষণ করুন।
        </p>
      </div>

      <ClassBatchManager role="DIRECTOR" />
    </div>
  );
}
