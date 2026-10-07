import { requirePageUser } from "@/lib/auth/guards";
import { AdminResultsContainer } from "@/components/admin/admin-results-container";

export const dynamic = "force-dynamic";
export const metadata = { title: "ফলাফল ও মার্কশিট" };

export default async function DirectorResultsPage() {
  await requirePageUser(["DIRECTOR"]);
  return <AdminResultsContainer />;
}
