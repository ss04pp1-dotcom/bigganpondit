"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  History,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
  Smartphone,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  FolderUp,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { bn } from "@/lib/constants";

interface Item {
  key: string;
  size: number;
  createdAt: string;
}

interface BackupFileSummary {
  fileName: string;
  sizeKb: number;
  createdAt: string;
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  examsCount: number;
  marksCount: number;
  routinesCount: number;
  noticesCount: number;
}

const RESTORE_CONFIRM_WORD = "RESTORE";

export function BackupManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // Typed-confirmation state for the destructive restore dialog.
  const [confirmText, setConfirmText] = useState("");

  // Mobile / Local Storage Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<BackupFileSummary | null>(null);
  const [importPayload, setImportPayload] = useState<any>(null);
  const [importConfirmText, setImportConfirmText] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      const json = await res.json();
      if (json.ok) setItems(json.backups ?? []);
    } catch {
      toast({ title: "ব্যাকআপ তালিকা লোড করা যায়নি।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(body: Record<string, unknown>, successMsg?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({ ok: false, error: "সার্ভার থেকে অবৈধ উত্তর এসেছে।" }));
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "কাজটি সম্পন্ন হয়নি।", variant: "destructive" });
        return null;
      }
      toast({ title: json.message ?? successMsg });
      await load();
      return json;
    } catch {
      toast({ title: "সার্ভারে সংযোগ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function confirmRestore(target: Item) {
    setConfirmText("");
    await action({ action: "restore", key: target.key });
  }

  // Handle selecting JSON backup file from mobile / device storage
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast({
        title: "অবৈধ ফাইল ফরম্যাট",
        description: "শুধুমাত্র .json ব্যাকআপ ফাইল নির্বাচন করুন।",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || parsed.version !== 1 || !parsed.tables || typeof parsed.tables !== "object") {
        toast({
          title: "অবৈধ ব্যাকআপ ফাইল",
          description: "এই ফাইলটিতে সঠিক ব্যাকআপ ডেটা নেই (version 1 এবং tables অনুপস্থিত)।",
          variant: "destructive",
        });
        return;
      }

      const tables = parsed.tables || {};
      const summary: BackupFileSummary = {
        fileName: file.name,
        sizeKb: Number((file.size / 1024).toFixed(1)),
        createdAt: parsed.createdAt || new Date().toISOString(),
        studentsCount: Array.isArray(tables.students) ? tables.students.length : 0,
        teachersCount: Array.isArray(tables.teachers) ? tables.teachers.length : 0,
        classesCount: Array.isArray(tables.classes) ? tables.classes.length : 0,
        examsCount: Array.isArray(tables.exams) ? tables.exams.length : 0,
        marksCount: Array.isArray(tables.marks) ? tables.marks.length : 0,
        routinesCount: Array.isArray(tables.routines) ? tables.routines.length : 0,
        noticesCount: Array.isArray(tables.notices) ? tables.notices.length : 0,
      };

      setImportPayload(parsed);
      setImportSummary(summary);
      setImportConfirmText("");
      setImportDialogOpen(true);
      toast({ title: "ব্যাকআপ ফাইল লোড হয়েছে!", description: "তথ্য যাচাই করে রিস্টোর নিশ্চিত করুন।" });
    } catch (err: any) {
      toast({
        title: "ফাইল রিড করতে ব্যর্থ",
        description: err?.message || "ফাইলটি সঠিক JSON নয়।",
        variant: "destructive",
      });
    } finally {
      // Clear input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const executeMobileImportRestore = async () => {
    if (!importPayload) return;
    setImportDialogOpen(false);
    const result = await action({
      action: "restore_upload",
      payload: importPayload,
      fileName: importSummary?.fileName || "mobile-backup.json",
    });
    if (result) {
      setImportSummary(null);
      setImportPayload(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input for native mobile / device storage file picking */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Cloudflare / Server Backup */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <DatabaseBackup className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-bold">ডেটাবেস ব্যাকআপ</p>
              <p className="text-[12px] text-muted-foreground">
                ব্যাকআপ তৈরি হয় Cloudflare R2-তে সংরক্ষিত হয়। রিস্টোরে বর্তমান তথ্য পরিবর্তিত হবে।
              </p>
            </div>
          </div>
          <Button className="gap-2" disabled={busy} onClick={() => action({ action: "create" })}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
            ব্যাকআপ তৈরি করুন
          </Button>
        </CardContent>
      </Card>

      {/* Mobile & Device Storage Import Card */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-white shadow-2xs">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-slate-900">মোবাইল বা ডিভাইস থেকে রিস্টোর (Import)</p>
                <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 font-bold">
                  নতুন
                </Badge>
              </div>
              <p className="text-[12px] text-slate-600 mt-0.5">
                আপনার ফোন স্টোরেজ বা কম্পিউটারে ডাউনলোড করা <b>.json</b> ব্যাকআপ ফাইল আপলোড করে সরাসরি ডেটাবেস রিস্টোর করুন।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="default"
              className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-9 text-xs shadow-xs"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderUp className="h-4 w-4" />
              ফাইল সিলেক্ট ও রিস্টোর
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* If a file has been selected, show its summary inspection preview */}
      {importSummary && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-amber-600" />
                <span className="font-bold text-sm text-slate-900">{importSummary.fileName}</span>
                <span className="text-xs text-slate-500 font-mono">({importSummary.sizeKb} KB)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                onClick={() => {
                  setImportSummary(null);
                  setImportPayload(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-amber-200">
                <span className="text-slate-500 block text-[11px]">শিক্ষার্থী</span>
                <span className="font-bold text-slate-800 text-sm">{bn(importSummary.studentsCount)} জন</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200">
                <span className="text-slate-500 block text-[11px]">শিক্ষক</span>
                <span className="font-bold text-slate-800 text-sm">{bn(importSummary.teachersCount)} জন</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200">
                <span className="text-slate-500 block text-[11px]">পরীক্ষা ও ফলাফল</span>
                <span className="font-bold text-slate-800 text-sm">{bn(importSummary.examsCount)} টি পরীক্ষা</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200">
                <span className="text-slate-500 block text-[11px]">ক্লাস রুটিন</span>
                <span className="font-bold text-slate-800 text-sm">{bn(importSummary.routinesCount)} টি ক্লাস</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-amber-200">
              <span className="text-xs text-slate-600">
                ব্যাকআপ তারিখ: <b>{new Date(importSummary.createdAt).toLocaleString("bn-BD")}</b>
              </span>
              <Button
                type="button"
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold h-8 text-xs"
                onClick={() => setImportDialogOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                এই ফাইলটি দিয়ে রিস্টোর করুন
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog for Mobile Import Restore */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              মোবাইল স্টোরেজ ব্যাকআপ রিস্টোর
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-xs text-slate-600">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <p className="font-semibold mb-1">সতর্কতা:</p>
                  <p>
                    <b>{importSummary?.fileName}</b> ফাইলটি রিস্টোর করলে বর্তমান ডেটাবেসের সকল তথ্য এই ফাইলের তথ্যে প্রতিস্থাপিত হবে।
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    সুরক্ষার জন্য সিস্টেম স্বয়ংক্রিয়ভাবে বর্তমান ডেটাবেসের একটি <b>pre-restore সেফটি ব্যাকআপ</b> সংরক্ষণ করে রাখবে।
                  </p>
                </div>

                {importSummary && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <p>• শিক্ষার্থী: {bn(importSummary.studentsCount)} জন</p>
                    <p>• শিক্ষক: {bn(importSummary.teachersCount)} জন</p>
                    <p>• পরীক্ষা: {bn(importSummary.examsCount)} টি ({bn(importSummary.marksCount)} টি নম্বর)</p>
                    <p>• ক্লাস রুটিন: {bn(importSummary.routinesCount)} টি</p>
                  </div>
                )}

                <div>
                  <span className="block font-medium text-slate-700 mb-1.5">
                    রিস্টোর নিশ্চিত করতে টাইপ করুন: <b className="text-slate-900">{RESTORE_CONFIRM_WORD}</b>
                  </span>
                  <Input
                    value={importConfirmText}
                    onChange={(e) => setImportConfirmText(e.target.value)}
                    placeholder={RESTORE_CONFIRM_WORD}
                    className="h-9 text-xs font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImportConfirmText("")}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={importConfirmText !== RESTORE_CONFIRM_WORD || busy}
              onClick={(e) => {
                e.preventDefault();
                executeMobileImportRestore();
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              হ্যাঁ, ডেটাবেস রিস্টোর করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 text-[15px] font-bold">ব্যাকআপ তালিকা ({bn(items.length)})</h3>
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> লোড হচ্ছে…</div>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
              এখনো কোনো ব্যাকআপ নেই।
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {items.map((it) => (
                <li key={it.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{it.key.split("/").pop()}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {new Date(it.createdAt).toLocaleString("bn-BD")} • {(it.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                      <a href={`/api/files/${it.key}`} download>
                        <Download className="h-3.5 w-3.5" /> ডাউনলোড
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" disabled={busy}>
                          <RotateCcw className="h-3.5 w-3.5" /> রিস্টোর
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>রিস্টোরের নিশ্চয়তা</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2">
                              <span className="block">
                                ব্যাকআপ রিস্টোর করলে বর্তমান সব তথ্য মুছে যাবে এবং ব্যাকআপের তথ্য বসবে। সব ব্যবহারকারীকে আবার লগইন করতে হবে।
                                রিস্টোরের আগে স্বয়ংক্রিয়ভাবে একটি <b>pre-restore</b> ব্যাকআপ তৈরি হবে, যা দিয়ে ভুল হলে পূর্বের অবস্থায় ফিরে যাওয়া যাবে।
                              </span>
                              <span className="block">
                                নিশ্চিত হতে টাইপ করুন: <b>{RESTORE_CONFIRM_WORD}</b>
                              </span>
                              <Input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={RESTORE_CONFIRM_WORD}
                                className="h-9"
                                autoComplete="off"
                              />
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => setConfirmText("")}
                          >
                            না
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={confirmText !== RESTORE_CONFIRM_WORD || busy}
                            onClick={(e) => {
                              e.preventDefault();
                              confirmRestore(it);
                            }}
                          >
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            হ্যাঁ, রিস্টোর করুন
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100" disabled={busy}>
                          <Trash2 className="h-3.5 w-3.5" /> মুছুন
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>মুছে ফেলার নিশ্চয়তা</AlertDialogTitle>
                          <AlertDialogDescription>এই ব্যাকআপটি মুছে ফেলা হবে। আপনি কি নিশ্চিত?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>না</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => action({ action: "delete", key: it.key })}>
                            মুছে ফেলুন
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
