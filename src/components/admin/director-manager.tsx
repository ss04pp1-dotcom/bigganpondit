"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  User,
  Fingerprint,
  FileSignature,
  School,
  Save,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageUpload } from "@/components/app/image-upload";
import { useToast } from "@/hooks/use-toast";
import { BiometricManager } from "@/components/app/biometric-manager";

interface DirectorRow {
  id: number;
  user_id: number;
  name: string;
  username: string;
  institution: string | null;
  photo_key: string | null;
  signature_key: string | null;
  remarks: string | null;
  created_at: string;
}

export function DirectorManager() {
  const [directors, setDirectors] = useState<DirectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDirector, setEditingDirector] = useState<DirectorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectorRow | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [signatureKey, setSignatureKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/directors");
      const json = await res.json();
      if (json.ok) {
        setDirectors(json.directors || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleOpenCreate() {
    setEditingDirector(null);
    setName("");
    setUsername("");
    setPassword("");
    setInstitution("");
    setRemarks("পরিদর্শক ও উপদেষ্টা");
    setPhotoKey(null);
    setSignatureKey(null);
    setModalOpen(true);
  }

  function handleOpenEdit(d: DirectorRow) {
    setEditingDirector(d);
    setName(d.name);
    setUsername(d.username);
    setPassword("");
    setInstitution(d.institution || "");
    setRemarks(d.remarks || "");
    setPhotoKey(d.photo_key);
    setSignatureKey(d.signature_key);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      toast({ title: "নাম ও ইউজারনেম আবশ্যক।", variant: "destructive" });
      return;
    }
    if (!editingDirector && (!password || password.length < 4)) {
      toast({ title: "নতুন পরিচালকের জন্য কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const url = editingDirector
        ? `/api/admin/directors/${editingDirector.id}`
        : "/api/admin/directors";
      const method = editingDirector ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password: password ? password.trim() : undefined,
          institution: institution.trim() || null,
          remarks: remarks.trim() || null,
          photo_key: photoKey,
          signature_key: signatureKey,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      toast({ title: json.message });
      setModalOpen(false);
      load();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/directors/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "মুছে ফেলা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            পরিচালক ব্যবস্থাপনা (Director Panel)
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            পরিচালকদের তথ্য, ছবি, কর্মস্থল, স্বাক্ষর ও বায়োমেট্রিক পরিচালনা করুন। পরিচালকরা ক্লাস নিবেন না, শুধুমাত্র পরিদর্শক ও মতামত দিবেন এবং রিপোর্টে স্বাক্ষর প্রদান করবেন।
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="h-10 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
          <Plus className="h-4 w-4" />
          নতুন পরিচালক যুক্ত করুন
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          পরিচালক তালিকা লোড হচ্ছে...
        </div>
      ) : directors.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">কোনো পরিচালক যুক্ত করা হয়নি</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            রিপোর্টের নিচে স্বয়ংক্রিয় স্বাক্ষরের জন্য এবং পর্যবেক্ষণ ও মতামতের জন্য পরিচালক যুক্ত করুন।
          </p>
          <Button onClick={handleOpenCreate} className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> প্রথম পরিচালক যুক্ত করুন
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directors.map((d) => (
            <Card key={d.id} className="overflow-hidden border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 text-white relative">
                <div className="flex items-center gap-3">
                  {d.photo_key ? (
                    <img
                      src={`/api/files/${d.photo_key}`}
                      alt={d.name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-white/80 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white font-bold text-lg border-2 border-white/40 shrink-0">
                      <User className="h-7 w-7" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-white truncate leading-tight">{d.name}</h3>
                    <p className="text-xs text-blue-100 font-mono mt-0.5">@{d.username}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      পরিচালক ও পরিদর্শক
                    </span>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <School className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">কোথায় পড়ছে / কর্মরত:</span>
                    <p className="text-slate-600">{d.institution || "উল্লেখ নেই"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">পরিদর্শক মন্তব্য/রোল:</span>
                    <p className="text-slate-600">{d.remarks || "ক্লাস নিবেন না, পরিদর্শক ও মতামত দিবেন"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <FileSignature className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">স্বাক্ষর:</span>
                    {d.signature_key ? (
                      <img
                        src={`/api/files/${d.signature_key}`}
                        alt="স্বাক্ষর"
                        className="h-6 max-w-[80px] object-contain border border-slate-200 rounded px-1 bg-white"
                      />
                    ) : (
                      <span className="text-[11px] text-amber-600">সংযুক্ত নেই</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(d)}
                    className="h-8 gap-1 text-xs text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    সম্পাদনা
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(d)}
                    className="h-8 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    মুছুন
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              {editingDirector ? "পরিচালকের তথ্য সম্পাদনা" : "নতুন পরিচালক যুক্ত করুন"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              পরিচালকের নাম, ছবি, কর্মস্থল ও স্বাক্ষর নির্ধারণ করুন। এই স্বাক্ষর স্বয়ংক্রিয়ভাবে রেজাল্ট শিটের নিচে যুক্ত হবে।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">পরিচালকের নাম *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: ইঞ্জিনিয়ার মাহমুদ হাসান"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">ইউজারনেম (লগইন আইডি) *</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="যেমন: director_mh"
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {editingDirector ? "পাসওয়ার্ড (পরিবর্তন করতে চাইলে লিখুন)" : "লগইন পাসওয়ার্ড *"}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                className="text-xs"
                required={!editingDirector}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                কোথায় পড়ছে / কর্মরত আছে (Institution / Workplace)
              </Label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="যেমন: বুয়েট / সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                পরিদর্শক ও মতামত ভূমিকা (Role Notes)
              </Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="কোন ক্লাস নিবে না, শুধু পরিদর্শক ও মতামত দিবে"
                className="text-xs"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">পরিচালকের ছবি</Label>
                <ImageUpload
                  type="director-photo"
                  label="ছবি (JPG, PNG)"
                  currentUrl={photoKey ? `/api/files/${photoKey}` : null}
                  onUploaded={(key) => setPhotoKey(key)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">পরিচালকের স্বাক্ষর (PNG/JPG)</Label>
                <ImageUpload
                  type="director-signature"
                  label="স্বাক্ষর ফাইল"
                  currentUrl={signatureKey ? `/api/files/${signatureKey}` : null}
                  onUploaded={(key) => setSignatureKey(key)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                বাতিল
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600">পরিচালক মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              আপনি কি নিশ্চিত যে <strong>{deleteTarget?.name}</strong>-কে মুছে ফেলতে চান? এটি পরিচালকের লগইন অ্যাকাউন্টও মুছে দেবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              হ্যাঁ, মুছুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
