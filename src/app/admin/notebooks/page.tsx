import { requirePageUser } from "@/lib/auth/guards";
import { NotebookViewer } from "@/components/app/notebook-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "নোট বুক" };

export default async function AdminNotebooksPage() {
  const user = await requirePageUser(["ADMIN"]);
  return <NotebookViewer user={user} />;
}
