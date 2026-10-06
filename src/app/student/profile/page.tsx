import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { StudentAvatar } from "@/components/app/student-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bn, classLabel, divisionLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "আমার প্রোফাইল" };

export default async function ProfilePage() {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();

  // per-subject exam count for this student (all years)
  const subjectStats = (
    await db
      .prepare(
        `SELECT s.name, COUNT(m.id) as exams, SUM(e.total_marks) as total, SUM(m.obtained_marks) as obtained
         FROM marks m JOIN exams e ON e.id = m.exam_id JOIN subjects s ON s.id = e.subject_id
         WHERE m.student_id = ?
         GROUP BY s.id ORDER BY s.name`
      )
      .bind(user.studentId)
      .all<{ name: string; exams: number; total: number; obtained: number }>()
  ).results;

  const studentExtra = user.studentId
    ? await db
        .prepare(
          "SELECT father_name, mother_name, school_name, phone, address, blood_group FROM students WHERE id = ?"
        )
        .bind(user.studentId)
        .first<{
          father_name?: string | null;
          mother_name?: string | null;
          school_name?: string | null;
          phone?: string | null;
          address?: string | null;
          blood_group?: string | null;
        }>(undefined as never)
        .catch(() => null)
    : null;

  const info: [string, string][] = [
    ["নাম", user.name],
    ["শ্রেণি", classLabel(user.className ?? "")],
    ["বিভাগ", user.division ? divisionLabel(user.division) : "প্রযোজ্য নয়"],
    ["শাখা", user.section ?? "—"],
    ["রোল", bn(user.roll ?? 0)],
    ["ইউজারনেম", `@${user.username}`],
  ];

  if (studentExtra?.school_name) info.push(["বিদ্যালয় / প্রতিষ্ঠান", studentExtra.school_name]);
  if (studentExtra?.father_name) info.push(["পিতার নাম", studentExtra.father_name]);
  if (studentExtra?.mother_name) info.push(["মাতার নাম", studentExtra.mother_name]);
  if (studentExtra?.phone) info.push(["অভিভাবকের ফোন", bn(studentExtra.phone)]);
  if (studentExtra?.blood_group) info.push(["রক্তের গ্রুপ", studentExtra.blood_group]);
  if (studentExtra?.address) info.push(["ঠিকানা", studentExtra.address]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">আমার প্রোফাইল</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">আপনার ব্যক্তিগত তথ্য — শুধু আপনি দেখতে পারেন।</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">ব্যক্তিগত তথ্য</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
              <StudentAvatar photoKey={user.photoKey} name={user.name} size="xl" />
              <div>
                <p className="text-lg font-bold">{user.name}</p>
                <p className="text-[13px] text-muted-foreground">শিক্ষার্থী — বিজ্ঞান পণ্ডিত একাডেমি</p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-border">
              {info.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <dt className="text-[13px] text-muted-foreground">{k}</dt>
                  <dd className="text-[14px] font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">বিষয়ভিত্তিক সারসংক্ষেপ (সব বছর)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-[12px]">বিষয়</TableHead>
                    <TableHead className="text-center text-[12px]">পরীক্ষা</TableHead>
                    <TableHead className="text-right text-[12px]">প্রাপ্ত/মোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">এখনো কোনো ফলাফল নেই।</TableCell>
                    </TableRow>
                  ) : (
                    subjectStats.map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="text-[13px] font-medium">{s.name}</TableCell>
                        <TableCell className="text-center text-[13px]">{bn(s.exams)}</TableCell>
                        <TableCell className="text-right text-[13px]">{bn(s.obtained)} / {bn(s.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
