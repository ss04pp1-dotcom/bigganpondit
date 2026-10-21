import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { WebsiteEditor } from "@/components/admin/website-editor";
import {
  SETTING_LANDING_PAGE,
  parseLandingConfig,
} from "@/lib/landing-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "ওয়েবসাইট ও কোর্স ব্যবস্থাপনা" };

export default async function AdminWebsitePage() {
  await requirePageUser(["ADMIN"]);
  const raw = await getSetting(SETTING_LANDING_PAGE, "");
  const config = parseLandingConfig(raw);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">পাবলিক ওয়েবসাইট, কোর্স ও ফিচার ব্যবস্থাপনা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          যে কেউ ওয়েবসাইটে ঢুকলে যে সকল কোর্স, বৈশিষ্ট্য, ভর্তি বিজ্ঞপ্তি ও যোগাযোগের তথ্য দেখতে পাবে তা এখান থেকে কাস্টমাইজ করুন।
        </p>
      </div>
      <WebsiteEditor initialConfig={config} />
    </div>
  );
}
