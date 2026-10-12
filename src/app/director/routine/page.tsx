import { requirePageUser } from "@/lib/auth/guards";
import { RoutineViewer } from "@/components/app/routine-viewer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ক্লাস রুটিন পরিদর্শক — বিজ্ঞান পণ্ডিত একাডেমি",
  description: "পরিচালকের জন্য সার্বিক একাডেমিক ক্লাস রুটিন বিবরণী।",
};

export default async function DirectorRoutinePage() {
  await requirePageUser(["DIRECTOR"]);
  return <RoutineViewer role="DIRECTOR" />;
}
