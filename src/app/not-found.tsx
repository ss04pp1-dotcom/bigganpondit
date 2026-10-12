import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-6xl font-black text-slate-800">৪০৪</h1>
        <h2 className="text-xl font-bold text-slate-700">পৃষ্ঠাটি পাওয়া যায়নি</h2>
        <p className="text-sm text-slate-500">
          আপনি যে পাতাটি খুঁজছেন তা মুছে ফেলা হয়েছে অথবা ভুল ঠিকানায় প্রবেশ করেছেন।
        </p>
        <div className="pt-2">
          <Button asChild className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
            <Link href="/">
              <Home className="h-4 w-4" />
              হোম পেজে ফিরুন
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
