"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function RedirectClient({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a2749] text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-sm font-medium text-blue-200">ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...</p>
      </div>
    </div>
  );
}
