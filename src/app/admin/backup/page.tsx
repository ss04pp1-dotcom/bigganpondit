import { requirePageUser } from "@/lib/auth/guards";
import { BackupManager } from "@/components/admin/backup-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "ব্যাকআপ" };

export default async function AdminBackupPage() {
  await requirePageUser(["ADMIN"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">ব্যাকআপ ও রিস্টোর</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          ডেটাবেসের সম্পূর্ণ ব্যাকআপ (JSON) — Cloudflare R2-তে সংরক্ষিত।
        </p>
      </div>
      <BackupManager />
    </div>
  );
}
