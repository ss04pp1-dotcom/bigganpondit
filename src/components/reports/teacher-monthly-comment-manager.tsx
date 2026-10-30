"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, Check, Edit2, Trash2, PenTool, Sparkles } from "lucide-react";
import { TransparentSignature } from "@/components/app/transparent-signature";
import type { TeacherRemarkItem } from "@/components/app/official-result-card";

interface TeacherMonthlyCommentManagerProps {
  studentId: number;
  studentName: string;
  month: number;
  year: number;
  mode: string;
  currentTeacher: {
    teacherId: number;
    name: string;
    role?: string;
    shortName?: string | null;
    signatureKey?: string | null;
  };
  initialComments: TeacherRemarkItem[];
  onCommentsChange?: (comments: TeacherRemarkItem[]) => void;
}

const QUICK_SUGGESTIONS = [
  "লেখাপড়ায় আরো মনোযোগী হতে হবে।",
  "চমৎকার অগ্রগতি! এই ধারাবাহিকতা বজায় রাখো।",
  "গণিত ও বিজ্ঞানের বেসিকে বাড়তি অনুশীলন প্রয়োজন।",
  "নিয়মিত ক্লাসে উপস্থিতি ও মনোযোগ প্রশংসনীয়।",
  "পরীক্ষার খাতায় উপস্থাপনা ও হাতের লেখা আরো সুন্দর করতে হবে।",
  "নিয়মিত রিভিশন ও বাড়ির কাজে সতর্কতা কাম্য।",
];

export function TeacherMonthlyCommentManager({
  studentId,
  studentName,
  month,
  year,
  mode,
  currentTeacher,
  initialComments,
  onCommentsChange,
}: TeacherMonthlyCommentManagerProps) {
  const router = useRouter();
  const [comments, setComments] = useState<TeacherRemarkItem[]>(initialComments || []);

  // Check if current teacher already has a comment for this student
  const myComment = (comments || []).find(
    (c) => Number(c.teacherId) === Number(currentTeacher?.teacherId)
  );
  const [text, setText] = useState<string>(myComment ? myComment.comment : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // CRITICAL: Synchronize state whenever switching student, month, year, mode or initialComments!
  // This guarantees comments from one student NEVER leak into another student!
  useEffect(() => {
    const list = initialComments || [];
    setComments(list);
    const mine = list.find((c) => Number(c.teacherId) === Number(currentTeacher?.teacherId));
    setText(mine ? mine.comment : "");
    setMessage(null);
  }, [studentId, month, year, mode, initialComments, currentTeacher?.teacherId]);

  const handleSave = async () => {
    if (!text.trim()) {
      setMessage({ type: "error", text: "অনুগ্রহ করে মন্তব্যের বিবরণ লিখুন।" });
      return;
    }

    const sid = Number(studentId);
    const m = Number(month);
    const y = Number(year);

    if (!sid || isNaN(sid)) {
      setMessage({ type: "error", text: "শিক্ষার্থী আইডি সনাক্ত করা যায়নি। অনুগ্রহ করে আবার শিক্ষার্থী নির্বাচন করুন।" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/teacher/monthly-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: sid,
          teacherId: currentTeacher?.teacherId,
          month: m,
          year: y,
          mode: mode || "MONTHLY",
          comment: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "মন্তব্য সংরক্ষণ করা সম্ভব হয়নি।");
      }

      const updated = data.comments || data.data?.comments || [];
      setComments(updated);
      if (onCommentsChange) onCommentsChange(updated);
      setMessage({ type: "success", text: "মন্তব্য সফলভাবে সংরক্ষিত হয়েছে এবং রেজাল্ট কার্ডে যুক্ত করা হয়েছে।" });

      // Refresh server components
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "ত্রুটি ঘটেছে।" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই মন্তব্যটি মুছে ফেলতে চান?")) return;

    setDeleting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/teacher/monthly-comments?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "মন্তব্য মুছতে ব্যর্থ হয়েছে।");
      }

      const updated = comments.filter((c) => c.id !== id);
      setComments(updated);
      setText("");
      if (onCommentsChange) onCommentsChange(updated);
      setMessage({ type: "success", text: "মন্তব্য মুছে ফেলা হয়েছে।" });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "ত্রুটি ঘটেছে।" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText((prev) => (prev ? `${prev} ${suggestion}` : suggestion));
  };

  return (
    <Card className="no-print border border-border shadow-xs bg-white">
      <CardHeader className="border-b border-border bg-slate-50/50 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-[15px] font-bold text-slate-800">
                শিক্ষকদের মন্তব্য ও রেজাল্ট কার্ড স্বাক্ষর ({studentName})
              </CardTitle>
              <p className="text-[12px] text-muted-foreground">
                যেই কয়জন শিক্ষক মন্তব্য দিবেন, তাদের প্রত্যেকের নাম, মন্তব্য ও স্বাক্ষর রেজাল্ট কার্ডের কভারে যুক্ত হবে।
              </p>
            </div>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200">
            {comments.length} জন শিক্ষকের মন্তব্য
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Existing comments list */}
        {comments.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[12px] font-semibold text-slate-700">সংরক্ষিত মন্তব্যসমূহ:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {comments.map((c) => {
                const isMine = Number(c.teacherId) === Number(currentTeacher?.teacherId);
                const canDelete = isMine || currentTeacher?.role === "ADMIN" || currentTeacher?.role === "DIRECTOR";
                return (
                  <div
                    key={c.id || c.teacherId}
                    className={`relative rounded-xl border p-3 text-[13px] transition ${
                      isMine ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{c.teacherName}</span>
                        {c.teacherShortName && (
                          <span className="rounded bg-slate-200 px-1 py-0.5 text-[10px] font-semibold text-slate-700">
                            {c.teacherShortName}
                          </span>
                        )}
                        {isMine && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-medium text-blue-800">
                            আপনি
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.date && <span className="text-[11px] text-muted-foreground">{c.date}</span>}
                        {canDelete && c.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deleting}
                            onClick={() => handleDelete(c.id!)}
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-700 italic leading-relaxed">
                      &ldquo;{c.comment}&rdquo;
                    </p>

                    <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-200/40 text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <PenTool className="h-3 w-3 text-slate-400" />
                        স্বাক্ষর:
                      </span>
                      {c.signatureUrl ? (
                        <div className="flex items-center gap-1">
                          <TransparentSignature
                            src={c.signatureUrl}
                            alt={`${c.teacherName}-এর স্বাক্ষর`}
                            className="h-5 max-w-[65px] object-contain"
                          />
                          <span className="text-[10px] text-emerald-700 font-medium">যুক্ত আছে</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold italic text-[#1e3a5f]">
                          {c.teacherShortName || c.teacherName.split(" ")[0]} (ডিজিটাল)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form for current teacher */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
              <Edit2 className="h-4 w-4 text-primary" />
              <span>
                {myComment ? "আপনার মন্তব্য সম্পাদনা করুন:" : "আপনার মন্তব্য প্রদান করুন:"}
              </span>
            </div>
            <span className="text-[12px] text-muted-foreground">
              শিক্ষক: <strong className="text-slate-700">{currentTeacher.name}</strong> ({currentTeacher.shortName || "—"})
            </span>
          </div>

          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="এই শিক্ষার্থীর মাসিক পারফরম্যান্স ও উন্নতির জন্য দিকনির্দেশনামূলক মন্তব্য লিখুন..."
            className="w-full resize-none rounded-lg border-border bg-white p-2.5 text-[13px] leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />

          {/* Quick suggestions */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>সহজ মন্তব্য নির্বাচন করুন (ক্লিক করলে যুক্ত হবে):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 transition hover:border-primary hover:bg-blue-50 hover:text-primary active:scale-95 cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Teacher signature indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-200/50 pt-2 text-[12px]">
            <div className="flex items-center gap-2 text-slate-600">
              <span>রেজাল্ট কার্ডে আপনার স্বাক্ষর:</span>
              {currentTeacher.signatureKey ? (
                <div className="flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                  <TransparentSignature
                    src={`/api/files/${currentTeacher.signatureKey}`}
                    alt="আপনার স্বাক্ষর"
                    className="h-5 max-w-[70px] object-contain"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold">(আপলোডকৃত)</span>
                </div>
              ) : (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
                  ডিজিটাল স্বাক্ষর ও নাম যুক্ত হবে (প্রোফাইল থেকে স্বাক্ষর আপলোড করতে পারেন)
                </span>
              )}
            </div>

            <Button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="h-9 px-4 font-bold shadow-xs select-none active:scale-95 transition-all cursor-pointer"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span>মন্তব্য সংরক্ষণ করুন</span>
                </span>
              )}
            </Button>
          </div>

          {message && (
            <div
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium border ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
