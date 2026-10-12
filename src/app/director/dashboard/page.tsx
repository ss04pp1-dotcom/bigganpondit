import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { DashboardBanner } from "@/components/app/dashboard-banner";
import { RecentResultBox } from "@/components/app/recent-result-box";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Users,
  CheckSquare,
  Search,
  BookMarked,
  Bell,
  ArrowRight,
  Sparkles,
  Eye,
} from "lucide-react";
import { bn } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "পরিচালক ড্যাশবোর্ড" };

export default async function DirectorDashboard() {
  const user = await requirePageUser(["DIRECTOR"]);
  const db = await getDb();

  // Get director profile
  const director = await db
    .prepare("SELECT * FROM directors WHERE user_id = ?")
    .bind(user.id)
    .first<any>()
    .catch(() => null);

  // Stats
  const teachersCount = (await db.prepare("SELECT COUNT(*) as c FROM teachers").first<{ c: number }>().catch(() => null))?.c ?? 0;
  const studentsCount = (await db.prepare("SELECT COUNT(*) as c FROM students").first<{ c: number }>().catch(() => null))?.c ?? 0;
  const classesCount = (await db.prepare("SELECT COUNT(*) as c FROM classes").first<{ c: number }>().catch(() => null))?.c ?? 0;
  const noticesCount = (await db.prepare("SELECT COUNT(*) as c FROM notices WHERE status = 'APPROVED'").first<{ c: number }>().catch(() => null))?.c ?? 0;

  const quickLinks = [
    {
      href: "/director/teachers",
      title: "শিক্ষক পরিদর্শক ও মতামত",
      desc: "শিক্ষকদের তালিকা দেখুন ও পরিদর্শকের মূল্যায়ন দিন",
      icon: GraduationCap,
      color: "from-blue-600 to-indigo-700",
    },
    {
      href: "/director/students",
      title: "শিক্ষার্থী তথ্য ও যোগাযোগ",
      desc: "সকল শ্রেণির শিক্ষার্থীর তথ্য ও তাৎক্ষণিক কল সুবিধা",
      icon: Users,
      color: "from-emerald-600 to-teal-700",
    },
    {
      href: "/director/attendance",
      title: "হাজিরা শিট ও ট্র্যাকিং",
      desc: "দৈনিক ও মাসিক উপস্থিতি রিপোর্ট এবং প্রিন্ট",
      icon: CheckSquare,
      color: "from-amber-600 to-orange-700",
    },
    {
      href: "/director/results",
      title: "ফলাফল ও মার্কশিট",
      desc: "ক্লাস ও মেধা তালিকা সহ মার্কশিট তৈরি ও প্রিন্ট",
      icon: Search,
      color: "from-purple-600 to-indigo-700",
    },
    {
      href: "/director/notebooks",
      title: "ডিজিটাল নোট বুক",
      desc: "সুরক্ষিত রিড-অনলি পাঠ্যবই ও লেকচার শিট",
      icon: BookMarked,
      color: "from-cyan-600 to-blue-700",
    },
    {
      href: "/director/notices",
      title: "নোটিশ বোর্ড",
      desc: "জরুরি নোটিশ প্রকাশ ও একাডেমি ঘোষণা",
      icon: Bell,
      color: "from-rose-600 to-pink-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <DashboardBanner
        user={user}
        panelTitle="পরিচালক প্যানেল"
        panelDesc="একাডেমির সার্বিক পরিদর্শক মূল্যায়ন ও রিপোর্ট পর্যবেক্ষণ কেন্দ্র।"
      />

      {/* Director Identity / Remarks Highlight Card */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-blue-50/70 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{user.name}</h2>
                <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                  পরিচালক (পরিদর্শক)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {director?.institution ? `কর্মরত / অধ্যয়নরত: ${director.institution}` : "একাডেমি পরিদর্শক"} • কোনো ক্লাস নিবেন না, শুধু একাডেমি পরিদর্শক ও দিকনির্দেশনা প্রদান করবেন।
              </p>
            </div>
          </div>

          {director?.signature_key && (
            <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 border border-blue-100 shrink-0">
              <span className="text-[11px] font-semibold text-slate-500">ডিজিটাল স্বাক্ষর:</span>
              <img
                src={`/api/files/${director.signature_key}`}
                alt="স্বাক্ষর"
                className="h-8 object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">মোট শিক্ষক</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">{bn(teachersCount)} জন</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">মোট শিক্ষার্থী</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{bn(studentsCount)} জন</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">সক্রিয় শ্রেণি</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{bn(classesCount)} টি</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">প্রকাশিত নোটিশ</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{bn(noticesCount)} টি</p>
        </div>
      </div>

      {/* 4. Recent Results Box with Top 3 Merit Podium */}
      <RecentResultBox user={user} defaultClass="10" />

      {/* Quick Access Modules */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">পরিচালক মডিউল ও সেবা</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-xs`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
