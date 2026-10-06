"use client";

// Teacher comment box — editable on screen, prints as written lines.

import { useState } from "react";

export function CommentBox({ defaultText = "" }: { defaultText?: string }) {
  const [text, setText] = useState(defaultText);
  return (
    <div className="print-avoid-break mt-4">
      <p className="mb-1 text-[13px] font-semibold">শিক্ষকের মন্তব্য:</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="শিক্ষার্থীর সম্পর্কে মন্তব্য লিখুন…"
        className="w-full resize-none rounded-lg border border-border bg-muted/30 p-3 text-[14px] leading-8 outline-none focus:border-primary"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)",
        }}
      />
    </div>
  );
}
