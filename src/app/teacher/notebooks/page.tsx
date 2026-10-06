import { requirePageUser } from "@/lib/auth/guards";
import { NotebookViewer } from "@/components/app/notebook-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "নোট বুক" };

export default async function TeacherNotebooksPage() {
  const user = await requirePageUser(["TEACHER"]);
  return <NotebookViewer user={user} />;
}
