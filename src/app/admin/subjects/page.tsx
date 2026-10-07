import { requirePageUser } from "@/lib/auth/guards";
import { SubjectManager } from "@/components/admin/subject-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "বিষয়" };

export default async function AdminSubjectsPage() {
  await requirePageUser(["ADMIN"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">বিষয় ব্যবস্থাপনা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">শ্রেণি অনুযায়ী বিষয় তালিকা — ৪র্থ বিষয় চিহ্নিতকরণ সহ।</p>
      </div>
      <SubjectManager />
    </div>
  );
}
