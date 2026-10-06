import { requirePageUser } from "@/lib/auth/guards";
import { NotebookViewer } from "@/components/app/notebook-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "নোট বুক" };

export default async function StudentNotebooksPage() {
  const user = await requirePageUser(["STUDENT"]);
  return <NotebookViewer user={user} />;
}
