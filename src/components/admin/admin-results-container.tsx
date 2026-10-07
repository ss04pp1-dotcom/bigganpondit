"use client";

import { useState } from "react";
import { FileText, ClipboardList } from "lucide-react";
import { AdminResultCardView } from "./admin-result-card-view";
import { ResultsManager } from "./results-manager";

export function AdminResultsContainer() {
  const [activeTab, setActiveTab] = useState<"CARD" | "MARKS">("CARD");

  return (
    <div className="space-y-4">
      {/* Top Navigation Tabs (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ফলাফল ও অফিশিয়াল রেজাল্ট কার্ড</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            লোগো ও পরিচালকের স্বাক্ষরযুক্ত শতভাগ অফিশিয়াল রেজাল্ট কার্ড প্রিন্ট করুন অথবা পরীক্ষার নম্বর ব্যবস্থাপনা করুন।
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("CARD")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
              activeTab === "CARD"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>রেজাল্ট কার্ড প্রিন্ট ও শিট</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MARKS")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
              activeTab === "MARKS"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>পরীক্ষার নম্বর ব্যবস্থাপনা</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "CARD" ? (
        <AdminResultCardView />
      ) : (
        <ResultsManager />
      )}
    </div>
  );
}
