"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "প্রিন্ট করুন (A4)" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" className="no-print gap-2" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
