import { requirePageUser } from "@/lib/auth/guards";
import { RoutineViewer } from "@/components/app/routine-viewer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ক্লাস রুটিন — বিজ্ঞান পণ্ডিত একাডেমি",
  description: "শিক্ষার্থীর সাপ্তাহিক ও আজকের ক্লাসের সময়সূচি।",
};

export default async function StudentRoutinePage() {
  await requirePageUser(["STUDENT"]);
  return <RoutineViewer role="STUDENT" />;
}
