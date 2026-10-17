import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { AttendanceManager } from "@/components/app/attendance-manager";
import { SETTING_DIRECTOR_SIGNATURE } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "হাজিরা শিট" };

export default async function AdminAttendancePage() {
  const user = await requirePageUser(["ADMIN"]);
  const dirSigKey = await getSetting(SETTING_DIRECTOR_SIGNATURE, "");

  return (
    <AttendanceManager
      user={user}
      directorSignatureUrl={dirSigKey ? `/api/files/${dirSigKey}` : null}
    />
  );
}
