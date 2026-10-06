"use client";

// Backup management (admin): create / download / restore / delete (R2-backed).

import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, Download, History, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { bn } from "@/lib/constants";

interface Item {
  key: string;
  size: number;
  createdAt: string;
}

export function BackupManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      const json = await res.json();
      if (json.ok) setItems(json.backups ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "কাজটি সম্পন্ন হয়নি।", variant: "destructive" });
        return null;
      }
      toast({ title: json.message ?? successMsg });
      await load();
      return json;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <DatabaseBackup className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-bold">ডেটাবেস ব্যাকআপ</p>
              <p className="text-[12px] text-muted-foreground">
                ব্যাকআপ তৈরি হয়ে Cloudflare R2-তে সংরক্ষিত হয়। রিস্টোরে বর্তমান তথ্য পরিবর্তিত হবে।
              </p>
            </div>
          </div>
          <Button className="gap-2" disabled={busy} onClick={() => action({ action: "create" })}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
            ব্যাকআপ তৈরি করুন
          </Button>
        </CardContent>
      </Card>

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
                          <AlertDialogDescription>
                            ব্যাকআপ রিস্টোর করলে বর্তমান সব তথ্য মুছে যাবে এবং ব্যাকআপের তথ্য বসবে। সব ব্যবহারকারীকে আবার লগইন করতে হবে। আপনি কি নিশ্চিত?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>না</AlertDialogCancel>
                          <AlertDialogAction onClick={() => action({ action: "restore", key: it.key })}>
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
