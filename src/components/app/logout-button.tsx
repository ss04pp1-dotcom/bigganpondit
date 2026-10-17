"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  variant = "outline",
  size = "sm",
  showLabel = true,
  label = "লগআউট",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "destructive" | "default" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  showLabel?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => null);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={loading}
      onClick={handleLogout}
      className={cn(
        "cursor-pointer font-semibold transition-all",
        className
      )}
      title="লগআউট করুন"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 text-rose-600" />
      )}
      {showLabel && <span>{loading ? "লগআউট হচ্ছে..." : label}</span>}
    </Button>
  );
}
