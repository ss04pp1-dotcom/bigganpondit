"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error captured by boundary:", error);

    // If it's a redirect that bubbled up
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message?.includes("NEXT_REDIRECT")) {
      const parts = (error.digest || "").split(";");
      const url = parts[2] || "/login";
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
      return;
    }

    // If it's a chunk loading failure due to deployment update
    if (
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("ChunkLoadError")
    ) {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }, [error]);

  function handleReload() {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  }

  function handleGoHome() {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">সাময়িক সমস্যা দেখা দিয়েছে</h2>
        <p className="mt-2 text-sm text-slate-600">
          অ্যাপ্লিকেশন লোড করার সময় একটি ত্রুটি ঘটেছে। ব্রাউজার ক্যাশ রিফ্রেশ করতে পুনরায় চেষ্টা করুন।
        </p>

        {error?.message && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-left">
            <p className="text-xs font-bold text-rose-700">ত্রুটির বিবরণ (Error details):</p>
            <p className="mt-1 text-xs font-mono text-rose-800 break-all select-all">
              {error.name}: {error.message}
            </p>
          </div>
        )}

        {error?.digest && (
          <p className="mt-2 text-xs font-mono text-slate-400 bg-slate-100 py-1 px-2 rounded">
            রেফারেন্স কোড: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={handleReload}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            পুনরায় চেষ্টা করুন
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full sm:w-auto gap-2"
          >
            <Home className="h-4 w-4" />
            হোম পেজ
          </Button>
        </div>
      </div>
    </div>
  );
}
