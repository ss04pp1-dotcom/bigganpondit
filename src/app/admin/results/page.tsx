import { requirePageUser } from "@/lib/auth/guards";
import { ResultsManager } from "@/components/admin/results-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "ফলাফল ও মার্কশিট" };

export default async function AdminResultsPage() {
  await requirePageUser(["ADMIN"]);
  return <ResultsManager />;
}
