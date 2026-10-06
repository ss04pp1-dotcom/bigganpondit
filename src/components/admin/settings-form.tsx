"use client";

// Academy settings form (admin).

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/app/image-upload";
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

  return (
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
          <Button className="mt-4 h-11 gap-2" onClick={save} disabled={saving}>
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
            label="লোগো (JPG/PNG)"
            currentUrl={logoKey ? `/api/files/${logoKey}` : null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
