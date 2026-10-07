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
  Expand,
  Shrink,
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
    cancel: () => void;
  };
}

export function PdfBookReader({ book, onClose }: PdfBookReaderProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [theme, setTheme] = useState<"DARK" | "SEPIA" | "LIGHT">("DARK");
  const [loading, setLoading] = useState<boolean>(true);
  const [pageRendering, setPageRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inputPage, setInputPage] = useState<string>("1");
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);

  // Store original page viewport dimensions (at scale 1.0)
  const [basePageDim, setBasePageDim] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });
  const [displayDim, setDisplayDim] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeRenderTaskRef = useRef<{ cancel: () => void; promise: Promise<void> } | null>(null);
  const initialFitDoneRef = useRef<boolean>(false);

  // Function to calculate fit-width scale based on current container width
  const calculateFitWidthZoom = useCallback((pageWidth: number) => {
    if (!scrollContainerRef.current || pageWidth <= 0) return 1.0;
    const containerWidth = scrollContainerRef.current.clientWidth;
    // Leave safe padding (16px on mobile, 32px on larger screens) so edges never clip
    const horizontalPadding = containerWidth < 640 ? 20 : 48;
    const availableWidth = Math.max(containerWidth - horizontalPadding, 260);
    const computedScale = availableWidth / pageWidth;
    // Keep zoom within comfortable reading bounds
    return Math.max(0.4, Math.min(computedScale, 2.0));
  }, []);

  // Function to calculate fit-page scale (both width and height fit inside viewport)
  const calculateFitPageZoom = useCallback(
    (pageWidth: number, pageHeight: number) => {
      if (!scrollContainerRef.current || pageWidth <= 0 || pageHeight <= 0) return 1.0;
      const containerWidth = scrollContainerRef.current.clientWidth;
      const containerHeight = scrollContainerRef.current.clientHeight;

      const horizontalPadding = containerWidth < 640 ? 24 : 48;
      const verticalPadding = 32;

      const availW = Math.max(containerWidth - horizontalPadding, 260);
      const availH = Math.max(containerHeight - verticalPadding, 300);

      const scaleW = availW / pageWidth;
      const scaleH = availH / pageHeight;

      return Math.max(0.35, Math.min(scaleW, scaleH, 1.8));
    },
    []
  );

  // Load PDF.js library and fetch file
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

        // Inspect page 1 dimensions to set optimal initial fit
        try {
          const p1 = await doc.getPage(1);
          const vp1 = p1.getViewport({ scale: 1.0 });
          setBasePageDim({ width: vp1.width, height: vp1.height });

          if (!initialFitDoneRef.current) {
            initialFitDoneRef.current = true;
            const fitZoom = calculateFitWidthZoom(vp1.width);
            setZoom(+fitZoom.toFixed(2));
          }
        } catch {
          // fallback
        }

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
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
      if (pdfDoc && pdfDoc.destroy) {
        try {
          pdfDoc.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [book.file_key, calculateFitWidthZoom]);

  // Render current page in ultra-high quality Retina supersampling
  const renderSinglePage = useCallback(
    async (pageNum: number, currentZoom: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel any ongoing render to avoid "Cannot use the same canvas during multiple render() operations"
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeRenderTaskRef.current = null;
      }

      try {
        setPageRendering(true);
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Base 1.0 viewport to track real dimensions
        const baseVp = page.getViewport({ scale: 1.0 });
        setBasePageDim({ width: baseVp.width, height: baseVp.height });

        // Display viewport on screen (CSS pixels)
        const displayViewport = page.getViewport({ scale: currentZoom });
        const cssWidth = Math.floor(displayViewport.width);
        const cssHeight = Math.floor(displayViewport.height);

        setDisplayDim({ width: cssWidth, height: cssHeight });

        // Device Pixel Ratio supersampling for 4K / Retina crystal clarity
        const dpr = typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 2.0) : 2.0;
        const renderScale = currentZoom * dpr;
        const renderViewport = page.getViewport({ scale: renderScale });

        // Internal high-res canvas buffer
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);

        // CSS display dimensions
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
        };

        const renderTask = page.render(renderContext);
        activeRenderTaskRef.current = renderTask;

        await renderTask.promise;
        activeRenderTaskRef.current = null;
        setPageRendering(false);
      } catch (err: unknown) {
        const errorObj = err as { name?: string };
        if (errorObj?.name !== "RenderingCancelledException") {
          console.error("PDF render error:", err);
        }
        setPageRendering(false);
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

  // Prevent unauthorized keys (Ctrl+S, Ctrl+P, Ctrl+C, Ctrl+U) and keyboard navigation
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
        setCurrentPage((prev) => {
          const next = Math.min(numPages, prev + 1);
          scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          return next;
        });
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((prev) => {
          const next = Math.max(1, prev - 1);
          scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          return next;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentPage(1);
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentPage(numPages);
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) => Math.max(0.4, +(prev - 0.15).toFixed(2)));
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
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setInputPage(String(currentPage));
    }
  }

  // Quick zoom presets
  const handleFitWidth = () => {
    const fitScale = calculateFitWidthZoom(basePageDim.width);
    setZoom(+fitScale.toFixed(2));
    toast({
      title: "প্রস্থে ফিট করা হয়েছে",
      description: "বইয়ের সম্পূর্ণ পাতা স্ক্রিনের মাপে নিখুঁতভাবে সমন্বয় করা হয়েছে। কোনো পাশ কাটবে না।",
    });
  };

  const handleFitPage = () => {
    const fitScale = calculateFitPageZoom(basePageDim.width, basePageDim.height);
    setZoom(+fitScale.toFixed(2));
    toast({
      title: "পুরো পৃষ্ঠা ফিট",
      description: "পুরো পাতা এক নজরে দেখার জন্য সমন্বয় করা হয়েছে।",
    });
  };

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
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-3 sm:px-5 backdrop-blur-md text-white shadow-sm z-30">
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

        {/* মাঝের অংশ: পৃষ্ঠা নেভিগেশন ও জুম (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-2">
          {/* পৃষ্ঠা নেভিগেশন */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 px-2 py-1 text-xs border border-slate-700/60 shadow-inner">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={currentPage <= 1 || loading}
              onClick={() => {
                setCurrentPage(1);
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
              onClick={() => {
                setCurrentPage((p) => Math.min(numPages, p + 1));
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
              onClick={() => {
                setCurrentPage(numPages);
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="শেষ পৃষ্ঠা (End)"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* জুম ও ফিট কন্ট্রোল */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 px-2 py-1 text-xs border border-slate-700/60 shadow-inner">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={zoom <= 0.4 || loading}
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="ছোট করুন (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>

            <button
              type="button"
              onClick={() => setZoom(1.0)}
              className="px-1.5 py-0.5 text-[11px] font-bold text-slate-300 hover:text-cyan-300"
              title="১০০% স্কেল"
            >
              {bn(Math.round(zoom * 100))}%
            </button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={zoom >= 2.5 || loading}
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
              className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="বড় করুন (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* প্রস্থে ফিট বাটন - পাতা দুই পাশ থেকে কখনো কাটবে না */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleFitWidth}
              className="h-7 px-2 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-950/60 hover:text-cyan-200"
              title="স্ক্রিনের প্রস্থ অনুযায়ী ফিট করুন (কাটবে না)"
            >
              <Expand className="h-3.5 w-3.5 mr-1" />
              প্রস্থে ফিট
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleFitPage}
              className="h-7 px-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              title="পুরো পৃষ্ঠা স্ক্রিনে ফিট করুন"
            >
              <Shrink className="h-3.5 w-3.5 mr-1" />
              পুরো পাতা
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

      {/* মোবাইল পৃষ্ঠা ও ফিট কন্ট্রোল স্ট্রিপ */}
      <div className="flex md:hidden items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 py-1.5 text-xs text-white z-20">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1 || loading}
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="h-7 px-2 text-xs bg-slate-800 border-slate-700 text-slate-200"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
            আগে
          </Button>
          <span className="text-[11px] font-bold text-cyan-300 px-1">
            {bn(currentPage)} / {bn(numPages || 1)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= numPages || loading}
            onClick={() => {
              setCurrentPage((p) => Math.min(numPages, p + 1));
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="h-7 px-2 text-xs bg-slate-800 border-slate-700 text-slate-200"
          >
            পরে
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFitWidth}
            className="h-7 px-2 text-[10px] font-bold bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
            title="স্ক্রিনের মাপে ফিট করুন"
          >
            <Expand className="h-3 w-3 mr-1" />
            প্রস্থে ফিট
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
            className="h-7 w-7 p-0 text-slate-300"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
            className="h-7 w-7 p-0 text-slate-300"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ================= মূল রিডিং এরিয়া (নো-কাটিং আর্কিটেকচার) ================= */}
      <main
        ref={scrollContainerRef}
        className="relative flex-1 overflow-auto p-2 sm:p-6 w-full"
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
          <div className="min-w-fit w-full flex flex-col items-center py-2 sm:py-4">
            {/* ক্যানভাস পেপার ফ্রেম (নিখুঁত প্রান্ত ও শূন্য কাটিং) */}
            <div
              className={cn(
                "relative transition-all rounded-md shadow-2xl ring-1",
                readerPaperStyles[theme]
              )}
              style={{
                width: `${displayDim.width}px`,
                minWidth: `${displayDim.width}px`,
                maxWidth: "none",
              }}
            >
              {/* রেন্ডারিং নির্দেশক স্পিনার (পৃষ্ঠা উল্টানোর সময়) */}
              {pageRendering && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-cyan-300 backdrop-blur-sm shadow-md border border-slate-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>রেন্ডার হচ্ছে…</span>
                </div>
              )}

              {/* হাই-রেজোলিউশন ক্যানভাস */}
              <canvas
                ref={canvasRef}
                className="block pointer-events-none rounded-md"
                style={{
                  display: "block",
                  width: `${displayDim.width}px`,
                  height: `${displayDim.height}px`,
                  maxWidth: "none",
                  imageRendering: "-webkit-optimize-contrast",
                }}
              />

              {/* অ্যান্টি-কপি / অ্যান্টি-ডাউনলোড সম্পূর্ণ স্বচ্ছ ইন্টারঅ্যাকশন স্তর */}
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
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] rotate-[-25deg] select-none text-slate-900 overflow-hidden">
                  <div className="text-center font-black leading-tight text-xl sm:text-2xl uppercase tracking-widest">
                    বিজ্ঞান পণ্ডিত প্রকাশনী<br />
                    ডিজিটাল লাইব্রেরি — কপি নিষিদ্ধ
                  </div>
                </div>
              </div>
            </div>

            {/* নিচের নেভিগেশন বাটনের দ্রুত অ্যাক্সেস */}
            <div
              className="mt-6 flex items-center justify-between px-2 text-xs font-semibold"
              style={{ width: `${Math.min(displayDim.width, 500)}px` }}
            >
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
      <footer className="shrink-0 border-t border-slate-800/80 bg-slate-950 px-4 py-2 text-center text-[11px] text-slate-400 z-30">
        বিজ্ঞান পণ্ডিত একাডেমি ডিজিটাল প্রকাশনী • শিক্ষার্থীদের জন্য শুধুমাত্র পড়ার উদ্দেশ্যে সংরক্ষিত • ডাউনলোড ও মুদ্রণ অননুমোদিত।
      </footer>
    </div>
  );
}
