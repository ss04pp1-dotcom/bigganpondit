"use client";

// Academy settings form (admin).

import { useState } from "react";
import { Loader2, Save, Trash2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/app/image-upload";
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

export function AdminSettingsForm({
  initialName,
  logoKey,
}: {
  initialName: string;
  logoKey: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  async function save() {
    if (!name.trim()) {
      toast({ title: "একাডেমির নাম লিখুন।", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyName: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleClearDemo(scope: "students_and_marks" | "all_demo") {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/clear-demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "ডেমো ডেটা মুছা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      // Reload page after a short delay so the dashboard and tables refresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">একাডেমির নাম</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label>নাম</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <Button className="mt-4 h-11 gap-2 bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সংরক্ষণ করুন
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">একাডেমির লোগো</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ImageUpload
              type="logo"
              label="লোগো (JPG/PNG/WebP)"
              currentUrl={logoKey ? `/api/files/${logoKey}` : null}
            />
          </CardContent>
        </Card>
      </div>

      {/* Fresh Start / Demo Data Wipe Card */}
      <Card className="border-amber-200 bg-amber-50/30 shadow-xs">
        <CardHeader className="border-b border-amber-200/60 pb-3">
          <CardTitle className="text-[16px] text-amber-950 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            ফ্রেশ প্রোডাকশন রিসেট ও ডেমো ডেটা মুছে ফেলা (Clean Slate)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-[13px] text-slate-700">
            আপনি কি আপনার আসল প্রতিষ্ঠানের জন্য সম্পূর্ণ খালি ও নতুন (Fresh) ডেটাবেস দিয়ে শুরু করতে চান? নিচের বোতামের সাহায্যে সব ডেমো শিক্ষার্থী, পরীক্ষা, নম্বর ও ডেমো শিক্ষক মুছে ফেলতে পারবেন। আপনার <strong>অ্যাডমিন অ্যাকাউন্ট, ৬ষ্ঠ-১০ম শ্রেণি ও পাঠ্যবইসমূহ অপরিবর্তিত থাকবে</strong>।
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={clearing}
                  className="h-11 gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  ডেমো শিক্ষার্থী, পরীক্ষা ও নম্বর মুছুন
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" /> ডেমো শিক্ষার্থী ও নম্বর মুছবেন?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 text-[13px]">
                    এটি সব ডেমো শিক্ষার্থী, পরীক্ষার এন্ট্রি ও নম্বর স্থায়ীভাবে মুছে দেবে। শিক্ষক অ্যাকাউন্টগুলো থাকবে।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleClearDemo("students_and_marks")}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    হ্যাঁ, ডেমো শিক্ষার্থী ও নম্বর মুছুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={clearing}
                  className="h-11 gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                >
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  সম্পূর্ণ ফ্রেশ রিসেট (সব ডেমো মুছুন)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" /> সম্পূর্ণ ফ্রেশ রিসেট নিশ্চিতকরণ
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 text-[13px]">
                    এটি সব ডেমো শিক্ষার্থী, পরীক্ষা, নম্বর এবং ডেমো শিক্ষক একাউন্ট (রাকিবুল ও মেহেদী) স্থায়ীভাবে মুছে দেবে। শুধুমাত্র আপনার বর্তমান অ্যাডমিন একাউন্ট, ৬ষ্ঠ-১০ম শ্রেণি ও বিষয়সমূহ বজায় থাকবে। পরবর্তীতে ডেমো ডেটা আর পুনরায় লোড হবে না।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleClearDemo("all_demo")}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    হ্যাঁ, সম্পূর্ণ ফ্রেশ রিসেট করুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
