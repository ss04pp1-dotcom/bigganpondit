import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { AttendanceManager } from "@/components/app/attendance-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "হাজিরা শিট" };

export default async function DirectorAttendancePage() {
  const user = await requirePageUser(["DIRECTOR"]);
  const db = await getDb();

  const director = await db
    .prepare("SELECT signature_key FROM directors WHERE user_id = ?")
    .bind(user.id)
    .first<{ signature_key: string | null }>()
    .catch(() => null);

  const sigUrl = director?.signature_key ? `/api/files/${director.signature_key}` : null;

  return <AttendanceManager user={user} directorSignatureUrl={sigUrl} />;
}
