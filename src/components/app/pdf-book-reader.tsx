"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Lock,
  Loader2,
  RotateCw,
  Sun,
  Moon,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { bn, classLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PdfBookReaderProps {
  book: {
    id: number;
    title: string;
    file_key: string;
    class_name?: string | null;
    subject_name?: string | null;
    uploader_name?: string;
  };
  onClose: () => void;
}

// PDF.js types
declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (src: string | { data: Uint8Array } | { url: string }) => {
        promise: Promise<PdfDocumentProxy>;
      };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
  }
}

interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy?: () => void;
}

interface PdfPageProxy {
  getViewport: (params: { scale: number; rotation?: number }) => {
    width: number;
    height: number;
  };
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    intent?: string;
  }) => {
    promise: Promise<void>;
  };
}

export function PdfBookReader({ book, onClose }: PdfBookReaderProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.15); // Comfortable reading scale
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [theme, setTheme] = useState<"DARK" | "SEPIA" | "LIGHT">("DARK");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inputPage, setInputPage] = useState<string>("1");
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<Promise<void> | null>(null);

  // Load PDF.js library
  useEffect(() => {
    let isMounted = true;

    async function loadPdfJs() {
      try {
        if (!window.pdfjsLib) {
          const script = document.createElement("script");
          script.src = "/vendor/pdfjs/pdf.min.js";
          script.async = true;
          document.body.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("PDF.js লাইব্রেরি লোড করা যায়নি।"));
          });
        }

        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
        }

        // Fetch PDF file buffer securely
        const response = await fetch(`/api/files/${book.file_key}`);
        if (!response.ok) {
          throw new Error("বইয়ের ফাইলটি সার্ভার থেকে আনা সম্ভব হয়নি।");
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = window.pdfjsLib!.getDocument({
          data: new Uint8Array(arrayBuffer),
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setInputPage("1");
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("PDF load error:", err);
        setError(err instanceof Error ? err.message : "বইটি লোড করতে সমস্যা হয়েছে।");
        setLoading(false);
      }
    }

    loadPdfJs();

    return () => {
      isMounted = false;
      if (pdfDoc && pdfDoc.destroy) {
        try {
          pdfDoc.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [book.file_key]);

  // Render current page in ultra-high quality Retina scaling
  const renderSinglePage = useCallback(
    async (pageNum: number, currentZoom: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        // Device Pixel Ratio supersampling for razor sharp clarity on retina and 4K displays
        const dpr = Math.max(window.devicePixelRatio || 1, 2.0);
        const renderScale = currentZoom * dpr;

        const viewport = page.getViewport({ scale: renderScale });
        const displayViewport = page.getViewport({ scale: currentZoom });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        canvas.style.width = `${Math.floor(displayViewport.width)}px`;
        canvas.style.height = `${Math.floor(displayViewport.height)}px`;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask.promise;
        await renderTask.promise;
      } catch (err) {
        // Rendering cancelled or error
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderSinglePage(currentPage, zoom);
      setInputPage(String(currentPage));
    }
  }, [pdfDoc, currentPage, zoom, renderSinglePage]);

  // Handle Fullscreen
  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // Prevent unauthorized keys (Ctrl+S, Ctrl+P, Ctrl+C, Ctrl+U)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p" || e.key === "c" || e.key === "u")) {
        e.preventDefault();
        toast({
          title: "সুরক্ষা বার্তা",
          description: "বইটি ডাউনলোড, কপি বা প্রিন্ট করা সম্পূর্ণ নিষিদ্ধ।",
          variant: "destructive",
        });
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(numPages, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentPage(numPages);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(2.5, prev + 0.15));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) => Math.max(0.6, prev - 0.15));
      } else if (e.key === "Escape") {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, onClose, toast]);

  // Jump to specific page
  function handlePageJump(e: React.FormEvent) {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setInputPage(String(currentPage));
    }
  }

  const themeStyles = {
    DARK: "bg-slate-950 text-slate-100",
    SEPIA: "bg-[#f4ecd8] text-[#433422]",
    LIGHT: "bg-slate-100 text-slate-900",
  };

  const readerPaperStyles = {
    DARK: "bg-white text-slate-900 shadow-2xl ring-1 ring-slate-800",
    SEPIA: "bg-[#fffef9] text-[#2c2217] shadow-xl ring-1 ring-[#e2d5bd]",
    LIGHT: "bg-white text-slate-900 shadow-xl ring-1 ring-slate-200",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 flex flex-col select-none transition-colors duration-200",
        themeStyles[theme]
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        toast({
          title: "কপিরাইট সুরক্ষা",
          description: "প্রকাশনীর এই বইটি শুধুমাত্র অনলাইনে পড়ার জন্য সংরক্ষিত। ডাউনলোড নিষিদ্ধ।",
        });
      }}
    >
      {/* ================= শীর্ষ কন্ট্রোল বার ================= */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-3 sm:px-5 backdrop-blur-md text-white shadow-sm">
        {/* বাম অংশ: বইয়ের তথ্য */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xs sm:text-sm font-bold text-white tracking-wide">
              {book.title}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              {book.class_name && (
                <span className="font-semibold text-cyan-300">
                  {classLabel(book.class_name)}
                </span>
              )}
              {book.subject_name && (
                <>
                  <span>•</span>
                  <span className="truncate">{book.subject_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* মাঝের অংশ: পৃষ্ঠা নেভিগেশন ও জুম */}
        <div className="hidden lg:flex items-center gap-2">
          {/* পৃষ্ঠা নেভিগেশন */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 px-2 py-1 text-xs border border-slate-700/60 shadow-inner">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(1)}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="প্রথম পৃষ্ঠা (Home)"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="পূর্ববর্তী পৃষ্ঠা (←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <form onSubmit={handlePageJump} className="flex items-center gap-1 px-1">
              <span className="text-[11px] text-slate-400">পৃষ্ঠা</span>
              <input
                type="text"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onBlur={handlePageJump}
                disabled={loading}
                className="h-6 w-11 rounded border border-slate-600 bg-slate-900 px-1 text-center text-xs font-bold text-cyan-300 focus:border-cyan-400 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-400">/ {bn(numPages || 1)}</span>
            </form>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={currentPage >= numPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="পরবর্তী পৃষ্ঠা (→)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={currentPage >= numPages || loading}
              onClick={() => setCurrentPage(numPages)}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="শেষ পৃষ্ঠা (End)"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* জুম কন্ট্রোল */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 px-2 py-1 text-xs border border-slate-700/60 shadow-inner">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={zoom <= 0.6 || loading}
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="ছোট করুন (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              onClick={() => setZoom(1.15)}
              className="px-1.5 py-0.5 text-[11px] font-bold text-slate-300 hover:text-cyan-300"
              title="রিসেট জুম (১০০%)"
            >
              {bn(Math.round(zoom * 100))}%
            </button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={zoom >= 2.5 || loading}
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="বড় করুন (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ডান অংশ: থিম, সুরক্ষা ব্যাজ ও উইন্ডো কন্ট্রোল */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* সুরক্ষা ব্যাজ */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <Lock className="h-3 w-3" />
            <span>সুরক্ষিত মোড</span>
          </div>

          {/* থিম নির্বাচক */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={() => setTheme("DARK")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-bold transition-colors",
                theme === "DARK" ? "bg-slate-950 text-cyan-300" : "text-slate-400 hover:text-white"
              )}
              title="ডার্ক মোড"
            >
              ডার্ক
            </button>
            <button
              onClick={() => setTheme("SEPIA")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-bold transition-colors",
                theme === "SEPIA" ? "bg-[#e5d5be] text-[#3d2f1f]" : "text-slate-400 hover:text-white"
              )}
              title="সিপিয়া মোড (চোখের আরাম)"
            >
              সিপিয়া
            </button>
            <button
              onClick={() => setTheme("LIGHT")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-bold transition-colors",
                theme === "LIGHT" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
              )}
              title="লাইট মোড"
            >
              লাইট
            </button>
          </div>

          {/* ফুলস্ক্রিন */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
            title={isFullscreen ? "স্বাভাবিক আকার" : "পূর্ণ পর্দা (Fullscreen)"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* বন্ধ করুন */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 text-red-400 hover:bg-red-950/50 hover:text-red-300"
            title="বন্ধ করুন (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* মোবাইল পৃষ্ঠা কন্ট্রোল স্ট্রিপ */}
      <div className="flex lg:hidden items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-white">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1 || loading}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200"
        >
          পূর্ববর্তী
        </Button>
        <span className="text-[11px] font-bold text-cyan-300">
          পৃষ্ঠা {bn(currentPage)} / {bn(numPages || 1)}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= numPages || loading}
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200"
        >
          পরবর্তী
        </Button>
      </div>

      {/* ================= মূল রিডিং এরিয়া ================= */}
      <main
        ref={scrollContainerRef}
        className="relative flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-3" />
            <p className="text-sm font-semibold">বইটি প্রস্তুত হচ্ছে…</p>
            <p className="text-xs text-slate-500 mt-1">উচ্চমানের টেক্সট ও ছবি রেন্ডার করা হচ্ছে</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <ShieldAlert className="h-12 w-12 text-rose-500 mb-3" />
            <h2 className="text-base font-bold text-rose-400">বইটি পড়া সম্ভব হচ্ছে না</h2>
            <p className="text-xs text-slate-400 mt-1.5">{error}</p>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              ফিরে যান
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="relative flex flex-col items-center max-w-full">
            {/* ক্যানভাস ধারক (নিখুঁত পেপার শ্যাডো ও মাপ) */}
            <div
              className={cn(
                "relative transition-all rounded-sm overflow-hidden",
                readerPaperStyles[theme]
              )}
            >
              <canvas
                ref={canvasRef}
                className="block pointer-events-none"
                style={{ imageRendering: "-webkit-optimize-contrast" }}
              />

              {/* অ্যান্টি-কপি / অ্যান্টি-ডাউনলোড স্বচ্ছ সুরক্ষা স্তর */}
              <div
                className="absolute inset-0 z-10 cursor-default"
                onContextMenu={(e) => {
                  e.preventDefault();
                  toast({
                    title: "সুরক্ষা বার্তা",
                    description: "ডাউনলোড ও কপি নিষিদ্ধ। শুধুমাত্র পড়ার জন্য অনুমোদিত।",
                  });
                }}
              >
                {/* হালকা ওয়াটারমার্ক প্যাটার্ন (কপিরাইট সুরক্ষা) */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] rotate-[-25deg] select-none text-slate-900">
                  <div className="text-center font-black leading-tight text-xl sm:text-2xl uppercase tracking-widest">
                    বিজ্ঞান পণ্ডিত প্রকাশনী<br />
                    ডিজিটাল লাইব্রেরি — কপি নিষিদ্ধ
                  </div>
                </div>
              </div>
            </div>

            {/* নিচের নেভিগেশন বাটনের দ্রুত অ্যাক্সেস */}
            <div className="mt-6 flex items-center justify-between w-full max-w-md px-2 text-xs font-semibold">
              <Button
                type="button"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="gap-1 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                আগের পৃষ্ঠা
              </Button>

              <span className="text-[12px] text-slate-400">
                পৃষ্ঠা <b className="text-cyan-400">{bn(currentPage)}</b> / {bn(numPages)}
              </span>

              <Button
                type="button"
                variant="outline"
                disabled={currentPage >= numPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(numPages, p + 1));
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="gap-1 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-30"
              >
                পরের পৃষ্ঠা
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ================= ফুটার সুরক্ষা বার্তা ================= */}
      <footer className="shrink-0 border-t border-slate-800/80 bg-slate-950 px-4 py-2 text-center text-[11px] text-slate-400">
        বিজ্ঞান পণ্ডিত একাডেমি ডিজিটাল প্রকাশনী • শিক্ষার্থীদের জন্য শুধুমাত্র পড়ার উদ্দেশ্যে সংরক্ষিত • ডাউনলোড ও মুদ্রণ অননুমোদিত।
      </footer>
    </div>
  );
}
