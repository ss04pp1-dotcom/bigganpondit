import { requirePageUser } from "@/lib/auth/guards";
import { PushNotificationManager } from "@/components/app/push-notification-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "পুশ নোটিফিকেশন" };

export default async function AdminNotificationsPage() {
  const user = await requirePageUser(["ADMIN"]);
  return <PushNotificationManager user={user} />;
}
