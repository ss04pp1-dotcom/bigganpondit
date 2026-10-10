import { requirePageUser } from "@/lib/auth/guards";
import { AdminRoutineManager } from "@/components/admin/admin-routine-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ক্লাস রুটিন ব্যবস্থাপনা — বিজ্ঞান পণ্ডিত একাডেমি",
  description: "একাডেমিক সাপ্তাহিক ও দৈনিক ক্লাস রুটিন তৈরি, পরিচালনা ও প্রিন্ট।",
};

export default async function AdminRoutinePage() {
  await requirePageUser(["ADMIN"]);
  return <AdminRoutineManager />;
}
