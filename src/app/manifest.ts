import type { MetadataRoute } from "next";
import { getDb, getSetting } from "@/lib/db";
import { DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let academyName = DEFAULT_ACADEMY_NAME;
  try {
    await getDb();
    const configuredName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
    if (configuredName) academyName = configuredName;
  } catch {
    // Fallback to default academy name
  }

  return {
    name: academyName,
    short_name: academyName,
    description: `${academyName} — পূর্ণাঙ্গ কোচিং ও একাডেমি ম্যানেজমেন্ট সিস্টেম, ক্লাস রুটিন, ব্যাচ ট্র্যাকিং ও রেজাল্ট পোর্টাল।`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/api/logo",
        sizes: "192x192 512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/logo?maskable=1",
        sizes: "192x192 512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
