import { requirePageUser } from "@/lib/auth/guards";
import { StudentManager } from "@/components/students/student-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষার্থী তথ্য" };

export default async function DirectorStudentsPage() {
  const user = await requirePageUser(["DIRECTOR"]);
  return <StudentManager role="DIRECTOR" />;
}
