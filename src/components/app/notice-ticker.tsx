"use client";

import { useEffect, useState } from "react";
import { Bell, Volume2, X } from "lucide-react";
import Link from "next/link";

interface TickerNotice {
  id: number;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
}

export function NoticeTicker() {
  const [notices, setNotices] = useState<TickerNotice[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/notices?ticker=true")
      .then((res) => res.json())
      .then((json) => {
        if (mounted && json.ok && Array.isArray(json.notices)) {
          setNotices(json.notices);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (dismissed || notices.length === 0) return null;

  return (
    <div className="relative z-20 flex items-center bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-3 py-1.5 text-white shadow-xs overflow-hidden text-[12px] font-medium border-b border-amber-700/20">
      <div className="flex items-center gap-1.5 bg-amber-700/80 px-2 py-0.5 rounded text-[11px] font-bold shrink-0 shadow-xs mr-2">
        <Volume2 className="h-3.5 w-3.5 animate-pulse text-amber-200" />
        <span>জরুরি নোটিশ:</span>
      </div>

      <div className="marquee-container flex-1 overflow-hidden whitespace-nowrap relative">
        <div className="inline-block animate-marquee hover:[animation-play-state:paused] cursor-pointer">
          {notices.map((n, i) => (
            <span key={n.id} className="inline-flex items-center mr-8">
              <span className="font-bold underline decoration-amber-200/60 underline-offset-2">
                {n.title}
              </span>
              <span className="mx-2 text-amber-100">•</span>
              <span className="text-amber-50">{n.content}</span>
              {i < notices.length - 1 && (
                <span className="mx-4 text-amber-300 font-bold">||</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 rounded p-1 text-amber-100 hover:bg-amber-700/60 hover:text-white shrink-0"
        title="নোটিশ লুকান"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
