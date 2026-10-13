import { requirePageUser } from "@/lib/auth/guards";
import { StudentFeesViewer } from "@/components/student/student-fees-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "আমার ফি ও বকেয়া" };

export default async function StudentFeesPage() {
  await requirePageUser(["STUDENT"]);
  return <StudentFeesViewer />;
}
