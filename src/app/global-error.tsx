"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="bn">
      <body style={{ fontFamily: "sans-serif", margin: 0, padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        <div style={{ maxWidth: "400px", textAlign: "center", background: "#fff", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: "0 0 10px" }}>সাময়িক সমস্যা দেখা দিয়েছে</h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px" }}>
            অ্যাপ্লিকেশন লোড করার সময় সমস্যা হয়েছে। পেজটি রিফ্রেশ করতে নিচের বোতামে চাপ দিন।
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
              else reset();
            }}
            style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
          >
            পুনরায় লোড করুন
          </button>
        </div>
      </body>
    </html>
  );
}
