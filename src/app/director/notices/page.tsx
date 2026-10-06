import { requirePageUser } from "@/lib/auth/guards";
import { NoticeBoard } from "@/components/app/notice-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "নোটিশ বোর্ড" };

export default async function DirectorNoticesPage() {
  const user = await requirePageUser(["DIRECTOR"]);
  return <NoticeBoard user={user} />;
}
