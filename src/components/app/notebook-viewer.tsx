"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  BookOpen,
  Plus,
  Search,
  Lock,
  Eye,
  FileText,
  Upload,
  Calendar,
  User,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CLASS_NUMBERS, bn, classLabel, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NotebookItem {
  id: number;
  title: string;
  class_id: number | null;
  subject_id: number | null;
  file_key: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: number;
  uploader_name: string;
  description: string | null;
  created_at: string;
  class_name: string | null;
  subject_name: string | null;
}

export function NotebookViewer({
  user,
}: {
  user: { name: string; role: Role; className?: string | null };
}) {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>(user.className || "ALL");
  const [search, setSearch] = useState("");

  // Reading state
  const [readingBook, setReadingBook] = useState<NotebookItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Upload modal state (Admin, Director, Teacher)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadClass, setUploadClass] = useState("10");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Class & subject list
  const [classesList, setClassesList] = useState<Array<{ id: number; name: string }>>([]);
  const [subjectsList, setSubjectsList] = useState<Array<{ id: number; name: string }>>([]);

  const { toast } = useToast();

  const canUpload = user.role === "ADMIN" || user.role === "DIRECTOR" || user.role === "TEACHER";

  const loadNotebooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notebooks");
      const json = await res.json();
      if (json.ok && Array.isArray(json.notebooks)) {
        setNotebooks(json.notebooks);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotebooks();
    // Load subjects
    fetch("/api/admin/subjects")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.subjects)) {
          setSubjectsList(json.subjects);
        }
      })
      .catch(() => {});
  }, [loadNotebooks]);

  const filtered = notebooks.filter((n) => {
    if (filterClass !== "ALL" && n.class_name !== filterClass) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchSubject = n.subject_name?.toLowerCase().includes(q);
      const matchUploader = n.uploader_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchSubject && !matchUploader) return false;
    }
    return true;
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast({ title: "বইয়ের নাম লিখুন।", variant: "destructive" });
      return;
    }
    if (!uploadFile) {
      toast({ title: "পিডিএফ ফাইল নির্বাচন করুন।", variant: "destructive" });
      return;
    }
    if (uploadFile.type !== "application/pdf" && !uploadFile.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "শুধুমাত্র PDF ফাইল আপলোড করা যাবে।", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload PDF file
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("type", "notebook-pdf");

      const upRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const upJson = await upRes.json();
      if (!upRes.ok || !upJson.ok) {
        toast({ title: upJson.error ?? "পিডিএফ ফাইল আপলোড ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }

      // Step 2: Save notebook record
      const selectedSub = subjectsList.find((s) => String(s.id) === uploadSubject);
      const subId = selectedSub ? selectedSub.id : null;

      const nbRes = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          classId: uploadClass ? Number(uploadClass) : null,
          subjectId: subId,
          fileKey: upJson.key,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          description: uploadDesc.trim() || undefined,
        }),
      });

      const nbJson = await nbRes.json();
      if (!nbRes.ok || !nbJson.ok) {
        toast({ title: nbJson.error ?? "নোটবুক সংরক্ষণ ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }

      toast({ title: "নোটবুক / বই সফলভাবে যুক্ত হয়েছে।" });
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDesc("");
      setUploadFile(null);
      loadNotebooks();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`'${title}' বইটি মুছে ফেলতে চান?`)) return;
    try {
      const res = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "বইটি মুছে ফেলা হয়েছে।" });
        loadNotebooks();
      } else {
        toast({ title: json.error ?? "মুছতে সমস্যা হয়েছে।", variant: "destructive" });
      }
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <Card className="border-cyan-100 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md">
              <BookMarked className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">ডিজিটাল নোট বুক ও লাইব্রেরি</h2>
              <p className="text-[12px] text-slate-500">
                অনলাইনে পাঠ্যবই ও লেকচার শিট পড়ার সুরক্ষিত মাধ্যম (রিড-অনলি মোড)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canUpload && (
              <Button
                onClick={() => setUploadOpen(true)}
                className="gap-1.5 bg-cyan-600 text-white hover:bg-cyan-700 shadow-xs text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
                নতুন বই আপলোড
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">শ্রেণি:</span>
          <button
            onClick={() => setFilterClass("ALL")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              filterClass === "ALL" ? "bg-cyan-600 text-white font-bold shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            সব শ্রেণি
          </button>
          {CLASS_NUMBERS.map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                filterClass === cls ? "bg-cyan-600 text-white font-bold shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {classLabel(cls)}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="বইয়ের নাম বা বিষয় খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
          বইয়ের তালিকা লোড হচ্ছে...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          <BookOpen className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold">কোনো বই বা নোট পাওয়া যায়নি।</p>
          <p className="text-xs text-slate-400 mt-1">অন্য শ্রেণি নির্বাচন করুন অথবা নতুন বই আপলোড করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <Card
              key={b.id}
              className="group overflow-hidden border border-slate-200 bg-white shadow-2xs transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
            >
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-cyan-900 via-slate-900 to-indigo-950 p-4 text-center text-white relative">
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs text-cyan-200">
                  <Lock className="h-2.5 w-2.5" /> সুরক্ষিত রিড-অনলি
                </div>
                {b.class_name && (
                  <div className="absolute top-2.5 right-2.5 rounded-md bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                    {classLabel(b.class_name)}
                  </div>
                )}
                <div className="space-y-1 mt-2">
                  <FileText className="mx-auto h-8 w-8 text-cyan-300 group-hover:scale-110 transition-transform" />
                  <p className="line-clamp-2 text-sm font-bold text-white px-2 leading-tight">
                    {b.title}
                  </p>
                </div>
              </div>

              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                    {b.subject_name || "সাধারণ নোট"}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    {b.uploader_name}
                  </span>
                </div>

                {b.description && (
                  <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed">
                    {b.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <span>{bn(b.created_at.split("T")[0] || b.created_at.slice(0, 10))}</span>
                  <div className="flex items-center gap-2">
                    {canUpload && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(b.id, b.title)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setReadingBook(b)}
                      className="h-7 gap-1 bg-cyan-600 px-3 text-xs font-semibold text-white hover:bg-cyan-700 shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      বই পড়ুন
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* READ-ONLY SECURE PDF READER MODAL */}
      <Dialog open={!!readingBook} onOpenChange={(open) => !open && setReadingBook(null)}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden bg-slate-950 border-slate-800 text-white transition-all flex flex-col",
            isFullscreen ? "!max-w-none !w-screen !h-screen !rounded-none" : "sm:max-w-[900px] h-[85vh] rounded-2xl"
          )}
        >
          {readingBook && (
            <>
              {/* Reader Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="font-bold truncate text-slate-200">{readingBook.title}</span>
                  {readingBook.class_name && (
                    <span className="hidden sm:inline rounded bg-cyan-900/80 text-cyan-200 border border-cyan-700 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                      {classLabel(readingBook.class_name)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden md:flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">
                    <Lock className="h-3 w-3" /> রিড-অনলি মোড (ডাউনলোড নিষিদ্ধ)
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                    title={isFullscreen ? "ছোট করুন" : "পূর্ণ পর্দা"}
                  >
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReadingBook(null)}
                    className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                    title="বন্ধ করুন"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* PDF Secure Embedded Iframe */}
              <div
                className="relative flex-1 bg-slate-900 select-none"
                onContextMenu={(e) => {
                  e.preventDefault();
                  toast({ title: "সুরক্ষা বার্তা", description: "ডাউনলোড ও কপি নিষিদ্ধ।" });
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p" || e.key === "c")) {
                    e.preventDefault();
                    toast({ title: "অননুমোদিত কমান্ড", description: "ডাউনলোড বা সংরক্ষণ অনুমোদিত নয়।" });
                  }
                }}
              >
                <iframe
                  src={`/api/files/${readingBook.file_key}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="h-full w-full border-0 bg-slate-900"
                  title={readingBook.title}
                />
              </div>

              {/* Reader Footer Warning */}
              <div className="border-t border-slate-800 bg-slate-950 px-4 py-1.5 text-center text-[11px] text-slate-400">
                বিজ্ঞান পণ্ডিত একাডেমি ডিজিটাল নোট বুক লাইব্রেরি • শুধুমাত্র অধ্যয়নের উদ্দেশ্যে সংরক্ষিত।
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* UPLOAD PDF MODAL (Admin / Director / Teacher) */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px] text-slate-900">
              <Upload className="h-5 w-5 text-cyan-600" />
              নতুন বই / নোট বুক আপলোড করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              শিক্ষার্থীদের জন্য পাঠ্যবই বা লেকচার শিটের PDF আপলোড করুন। এটি সরাসরি রিড-অনলি মোডে সংরক্ষিত হবে।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">বই বা নোটের শিরোনাম *</Label>
              <Input
                placeholder="যেমন: পদার্থবিজ্ঞান অধ্যায় ১ লেকচার শিট"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">শ্রেণি *</Label>
                <Select value={uploadClass} onValueChange={setUploadClass}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="শ্রেণি নির্বাচন" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_NUMBERS.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {classLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">বিষয় (ঐচ্ছিক)</Label>
                <Select value={uploadSubject} onValueChange={setUploadSubject}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="বিষয় নির্বাচন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">সাধারণ</SelectItem>
                    {subjectsList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">পিডিএফ ফাইল নির্বাচন করুন (PDF Only, Max 25MB) *</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
                className="text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
              />
              {uploadFile && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  নির্বাচিত ফাইল: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)</Label>
              <Textarea
                placeholder="বইটির বিষয়বস্তু বা শিক্ষার্থীদের জন্য নির্দেশনা..."
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
                className="text-xs h-8"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="gap-1.5 bg-cyan-600 text-white hover:bg-cyan-700 text-xs h-8 font-semibold shadow-xs"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    আপলোড হচ্ছে...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    সংরক্ষণ করুন
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
