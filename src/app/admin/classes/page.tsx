import { requirePageUser } from "@/lib/auth/guards";
import { ClassBatchManager } from "@/components/admin/class-batch-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "শ্রেণি ও ব্যাচ ব্যবস্থাপনা" };

export default async function AdminClassesPage() {
  await requirePageUser(["ADMIN"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">শ্রেণি ও ব্যাচ ব্যবস্থাপনা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          অ্যাকাডেমির শ্রেণি তৈরি, পরিবর্তন এবং নির্দিষ্ট ব্যাচের নাম দিয়ে ব্যাচ ও সময়সূচী যুক্ত করুন।
        </p>
      </div>

      <ClassBatchManager role="ADMIN" />
    </div>
  );
}
