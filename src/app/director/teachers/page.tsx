import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, BookOpen, User, CheckCircle2, School } from "lucide-react";
import { bn } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষক পরিদর্শক" };

export default async function DirectorTeachersPage() {
  const user = await requirePageUser(["DIRECTOR"]);
  const db = await getDb();

  const teachers = (
    await db
      .prepare(
        `SELECT t.id, t.user_id, t.short_name, t.photo_key, t.signature_key,
                u.name, u.username
         FROM teachers t
         JOIN users u ON u.id = t.user_id
         ORDER BY t.id ASC`
      )
      .all<any>()
      .catch(() => null)
  )?.results ?? [];

  // Load subject mappings
  const teacherSubjects = (
    await db
      .prepare(
        `SELECT ts.teacher_id, s.name as subject_name, c.name as class_name
         FROM teacher_subjects ts
         JOIN subjects s ON s.id = ts.subject_id
         JOIN classes c ON c.id = ts.class_id`
      )
      .all<any>()
      .catch(() => null)
  )?.results ?? [];

  const subMap: Record<number, Array<{ subject: string; class: string }>> = {};
  for (const ts of teacherSubjects) {
    if (!subMap[ts.teacher_id]) subMap[ts.teacher_id] = [];
    subMap[ts.teacher_id].push({ subject: ts.subject_name, class: ts.class_name });
  }

  return (
    <div className="space-y-5">
      <Card className="border-blue-100 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">শিক্ষক পরিদর্শক ও মূল্যায়ন</h2>
              <p className="text-[12px] text-slate-500">
                একাডেমির সকল শিক্ষকের বিষয় ও কার্যতালিকা পর্যবেক্ষণ
              </p>
            </div>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            মোট শিক্ষক: {bn(teachers.length)} জন
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((t: any) => {
          const subs = subMap[t.id] || [];
          return (
            <Card key={t.id} className="border border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {t.photo_key ? (
                    <img
                      src={`/api/files/${t.photo_key}`}
                      alt={t.name}
                      className="h-12 w-12 rounded-full object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-base">
                      {t.short_name || t.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{t.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      সংক্ষিপ্ত নাম: {t.short_name || "—"} • @{t.username}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-blue-600" /> পাঠদানকৃত বিষয়সমূহ:
                  </span>
                  {subs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">কোনো বিষয় নির্ধারিত নেই</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                        >
                          {s.subject} ({s.class} শ্রেণি)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {t.signature_key && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>স্বাক্ষর সংযুক্ত</span>
                    <img
                      src={`/api/files/${t.signature_key}`}
                      alt="স্বাক্ষর"
                      className="h-6 object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
