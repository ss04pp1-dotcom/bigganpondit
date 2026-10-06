import { requirePageUser } from "@/lib/auth/guards";
import { NotebookViewer } from "@/components/app/notebook-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "ডিজিটাল নোট বুক" };

export default async function DirectorNotebooksPage() {
  const user = await requirePageUser(["DIRECTOR"]);
  return <NotebookViewer user={user} />;
}
