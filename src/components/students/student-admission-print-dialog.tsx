"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, Printer, RotateCcw, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { classLabel, divisionLabel } from "@/lib/constants";

export interface AdmissionPrintableStudent {
  id: number;
  name: string;
  roll: number;
  class_name: string;
  division: string | null;
  section: string | null;
  batch_name?: string | null;
  photo_key: string | null;
  father_name?: string | null;
  father_occupation?: string | null;
  mother_name?: string | null;
  mother_occupation?: string | null;
  guardian_name?: string | null;
  guardian_occupation?: string | null;
  guardian_relation?: string | null;
  school_name?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
}

interface DirectorSigOption {
  id: number;
  name: string;
  signature_key: string | null;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function toBanglaNum(val: string | number | null | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

function formatSerial(num: number): string {
  return num < 10 ? "০" + toBanglaNum(num) : toBanglaNum(num);
}

function formatBanglaDate(createdAt?: string | null): string {
  let d = new Date();
  if (createdAt) {
    const parsed = new Date(createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T") + "Z");
    if (!Number.isNaN(parsed.getTime())) {
      d = parsed;
    }
  }
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(d);
    const dd = parts.find((p) => p.type === "day")?.value || "01";
    const mm = parts.find((p) => p.type === "month")?.value || "01";
    const yyyy = parts.find((p) => p.type === "year")?.value || String(d.getFullYear());
    return toBanglaNum(`${dd}/${mm}/${yyyy}`);
  } catch {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return toBanglaNum(`${dd}/${mm}/${yyyy}`);
  }
}

function parseBanglaAddress(address?: string | null): {
  village: string;
  postOffice: string;
  upazila: string;
  district: string;
} {
  const empty = { village: "", postOffice: "", upazila: "", district: "" };
  if (!address || !address.trim()) return empty;
  const raw = address.trim();

  // Check if address already contains explicit Bangla labels
  const labelPatterns: Array<{ key: keyof typeof empty; re: RegExp }> = [
    { key: "village", re: /(?:গ্রাম|মহল্লা|বাড়ি|বাসা)\s*[:ঃ-]?\s*([^,।;\n]+)/i },
    { key: "postOffice", re: /(?:ডাকঘর|ডাক|পোস্ট(?:\s*অফিস)?)\s*[:ঃ-]?\s*([^,।;\n]+)/i },
    { key: "upazila", re: /(?:উপজেলা|থানা)\s*[:ঃ-]?\s*([^,।;\n]+)/i },
    { key: "district", re: /(?:জেলা)\s*[:ঃ-]?\s*([^,।;\n]+)/i },
  ];

  const labeled = { ...empty };
  let foundAnyLabel = false;
  for (const { key, re } of labelPatterns) {
    const m = raw.match(re);
    if (m && m[1]?.trim()) {
      labeled[key] = m[1].trim();
      foundAnyLabel = true;
    }
  }
  if (foundAnyLabel) return labeled;

  // Otherwise split by comma / pipe / Bangla dari / semicolon
  const parts = raw
    .split(/[,।;\n|]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 4) {
    return {
      village: parts[0],
      postOffice: parts[1],
      upazila: parts[2],
      district: parts.slice(3).join(", "),
    };
  }
  if (parts.length === 3) {
    return {
      village: parts[0],
      postOffice: "",
      upazila: parts[1],
      district: parts[2],
    };
  }
  if (parts.length === 2) {
    return {
      village: parts[0],
      postOffice: "",
      upazila: parts[1],
      district: "",
    };
  }
  return {
    village: parts[0] || raw,
    postOffice: "",
    upazila: "",
    district: "",
  };
}

function formatClassShort(className: string): string {
  const full = classLabel(className);
  // Keep concise class display matching "৯ম" / "অষ্টম শ্রেণি" cleanly
  const shortMap: Record<string, string> = {
    "6": "৬ষ্ঠ",
    "7": "৭ম",
    "8": "৮ম",
    "9": "৯ম",
    "10": "১০ম",
  };
  return shortMap[className] ?? full;
}

function formatSectionOrDivision(student: AdmissionPrintableStudent): string {
  const divText = student.division ? divisionLabel(student.division) : "";
  const rawSec = typeof student.section === "string" ? student.section.trim() : "";
  const secText =
    rawSec && rawSec !== "-" && rawSec !== "—" && rawSec.toLowerCase() !== "null" && rawSec.toLowerCase() !== "n/a"
      ? rawSec
      : "";
  if (divText && secText) return `${divText} / ${secText}`;
  if (divText) return divText;
  if (secText) return secText;
  return "";
}

const A4_PREVIEW_WIDTH_PX = 794; // 210mm at 96dpi
const A4_PREVIEW_HEIGHT_PX = 1115; // 295mm at 96dpi

const trimmedLogoCache = new Map<string, string>();

/**
 * Automatically trims empty outer transparent (or solid-white) margins from the
 * academy logo so the actual artwork fills the header frame without pushing
 * the address bar and form sections downward.
 */
function useTrimmedLogo(src: string | null): string | null {
  const [trimmed, setTrimmed] = useState<string | null>(() =>
    src ? trimmedLogoCache.get(src) ?? src : null
  );

  useEffect(() => {
    if (!src) {
      setTrimmed(null);
      return;
    }
    const cached = trimmedLogoCache.get(src);
    if (cached) {
      setTrimmed(cached);
      return;
    }
    setTrimmed(src);

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, w, h);

        const cornerCoords = [
          [0, 0],
          [w - 1, 0],
          [0, h - 1],
          [w - 1, h - 1],
        ];
        let transparentCorners = 0;
        let whiteCorners = 0;
        for (const [cx, cy] of cornerCoords) {
          const idx = (cy * w + cx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a < 15) transparentCorners++;
          else if (r >= 244 && g >= 244 && b >= 244) whiteCorners++;
        }

        const trimByAlpha = transparentCorners >= 3;
        const trimByWhite = !trimByAlpha && whiteCorners >= 3;
        if (!trimByAlpha && !trimByWhite) {
          trimmedLogoCache.set(src, src);
          return;
        }

        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const a = data[idx + 3];
            const isContent = trimByAlpha
              ? a >= 15
              : a >= 15 && (data[idx] < 244 || data[idx + 1] < 244 || data[idx + 2] < 244);
            if (isContent) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX <= minX || maxY <= minY) {
          trimmedLogoCache.set(src, src);
          return;
        }

        const pad = 2;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
        const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

        if (w - sw < 4 && h - sh < 4) {
          trimmedLogoCache.set(src, src);
          return;
        }

        const out = document.createElement("canvas");
        out.width = sw;
        out.height = sh;
        const outCtx = out.getContext("2d");
        if (!outCtx) return;
        outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = out.toDataURL("image/png");
        trimmedLogoCache.set(src, dataUrl);
        if (active) setTrimmed(dataUrl);
      } catch {
        // Keep original src on canvas/CORS failure
      }
    };

    img.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  return trimmed;
}

function sanitizeBgUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (/["'()\r\n;]/.test(trimmed)) return null;
  if (
    trimmed.startsWith("/api/files/") ||
    trimmed.startsWith("blob:") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

const ADMISSION_FORM_CSS = `
.af-root,
.af-root * {
  box-sizing: border-box;
  font-family: 'Kalpurush', 'Tiro Bangla', 'SolaimanLipi', Arial, sans-serif;
  letter-spacing: normal;
}

.af-a4-container {
  width: 210mm;
  height: 295mm;
  padding: 5mm;
  margin: 0 auto;
  background-color: #fff;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-sizing: border-box;
  font-size: 16px;
  color: #000;
  line-height: 1.3;
  page-break-inside: avoid;
  page-break-after: avoid;
  text-align: left;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-border-box {
  border: 2px dashed #1a237e;
  border-radius: 12px;
  padding: 4px 10px 6px 10px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

.af-header {
  text-align: center;
  margin-bottom: 1px;
}

.af-logo-slot {
  height: 122px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0 auto 2px auto;
}

.af-header img.af-logo-top {
  height: 120px;
  max-height: 120px;
  max-width: 600px;
  width: auto;
  object-fit: contain;
  margin: 0 auto;
  display: block;
}

.af-sub-address-bar {
  background-color: #fbc02d !important;
  color: #000;
  text-align: center;
  padding: 2px 10px;
  font-weight: bold;
  font-size: 14.5px;
  border-radius: 4px;
  margin: 2px 0 4px 0;
  border: 1px solid #f57f17;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-form-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.af-form-title-badge {
  border: 2px solid #000;
  border-radius: 8px;
  padding: 1px 20px;
  font-size: 17px;
  background-color: #fff;
}

.af-info-card-blue {
  background-color: #e3f2fd !important;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 5px 8px;
  margin-bottom: 3px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-info-card-pink {
  background-color: #fce4ec !important;
  border: 1px solid #f8bbd0;
  border-radius: 8px;
  padding: 5px 8px;
  margin-bottom: 3px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-info-card-green {
  background-color: #e8f5e9 !important;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 5px 8px;
  margin-bottom: 3px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-form-grid {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 8px;
}

.af-fields-column {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.af-field-row {
  display: flex;
  align-items: baseline;
  font-size: 16px;
  white-space: nowrap;
}

.af-field-label {
  font-weight: bold;
}

.af-dots-fill {
  border-bottom: 1px dotted #000;
  flex-grow: 1;
  margin: 0 4px;
  min-width: 20px;
  padding-left: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.af-photo-box {
  width: 115px;
  height: 130px;
  border: 2px dashed #444;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #666;
  background-color: #fff;
  overflow: hidden;
}

.af-photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.af-section-divider {
  text-align: center;
  font-weight: bold;
  color: #b71c1c;
  font-size: 16px;
  margin-bottom: 2px;
}

.af-terms-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 14.5px;
  background-color: #fff9c4 !important;
  margin-top: 3px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-terms-card ol {
  list-style-type: decimal !important;
  list-style-position: outside !important;
  padding-left: 18px !important;
  margin: 0 !important;
}

.af-terms-card li {
  display: list-item !important;
  margin-bottom: 1px !important;
}

.af-signatures-row {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 10px;
  font-size: 15px;
}

.af-sig-box-wrapper {
  background-color: #ffffff !important;
  border: 1.5px dashed #444;
  border-radius: 6px;
  padding: 6px 12px;
  width: 210px;
  text-align: center;
  position: relative;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.05);
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-sig-box-container {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.af-sig-img {
  max-height: 38px;
  max-width: 170px;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.af-sig-title {
  border-top: 1px dotted #000;
  padding-top: 2px;
  font-weight: bold;
  margin-top: 2px;
  display: block;
}

.af-cut-line {
  border-top: 2px dashed #000;
  margin: 4px 0;
  position: relative;
  text-align: center;
}

.af-cut-line-icon {
  position: absolute;
  left: 15px;
  top: -12px;
  background: #fff;
  padding: 0 5px;
  font-size: 15px;
}

.af-student-copy-card {
  border: 2px solid #8e44ad;
  border-radius: 8px;
  padding: 6px;
  background-color: #ffffff !important;
  display: flex;
  gap: 10px;
  align-items: stretch;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-student-copy-left {
  width: 200px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fcfbf7 !important;
  border: 1px solid #dcd6cd;
  border-radius: 6px;
  padding: 4px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.af-student-copy-left img {
  width: 180px;
  height: auto;
  max-height: 58px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.af-student-copy-left .af-address-text {
  font-size: 10.5px;
  line-height: 1.2;
  margin-top: 3px;
  color: #2c3e50;
  font-weight: bold;
}

.af-student-copy-left .af-contact-text {
  font-size: 10.5px;
  font-weight: bold;
  color: #b71c1c;
  margin-top: 2px;
}

.af-student-copy-right {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 14px;
  padding: 6px 10px;
  background-color: #ffffff !important;
  border: 1.5px solid #000;
  border-radius: 10px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  min-width: 0;
}

.af-stub-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 12px;
}

.af-stub-info-grid div {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.af-stub-signature-area {
  text-align: right;
  margin-top: 6px;
  padding-right: 10px;
}

.af-stub-sig-line {
  border-top: 1px dotted #000;
  padding-top: 2px;
  display: inline-block;
  position: relative;
  min-width: 130px;
  text-align: center;
  font-size: 13px;
  font-weight: bold;
}

.af-stub-sig-img {
  max-height: 25px;
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  mix-blend-mode: multiply;
}

#admissionPrintArea {
  display: none;
}

@media print {
  @page {
    size: A4 portrait !important;
    margin: 0 !important;
  }
  @page :left {
    size: A4 portrait !important;
    margin: 0 !important;
  }
  @page :right {
    size: A4 portrait !important;
    margin: 0 !important;
  }
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: 210mm !important;
    height: 295mm !important;
    max-height: 295mm !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body > *:not(#admissionPrintArea),
  [data-radix-portal],
  [role="dialog"] {
    display: none !important;
    visibility: hidden !important;
  }
  #admissionPrintArea {
    display: block !important;
    visibility: visible !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 210mm !important;
    height: 295mm !important;
    max-height: 295mm !important;
    padding: 0 !important;
    margin: 0 !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    background: transparent !important;
  }
  #admissionPrintArea * {
    visibility: visible !important;
  }
}
`;

function AdmissionFormSheet({
  student,
  logoUrl,
  bgUrl,
  adminSigUrl,
}: {
  student: AdmissionPrintableStudent;
  logoUrl: string | null;
  bgUrl: string | null;
  adminSigUrl: string | null;
}) {
  const [logoError, setLogoError] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const addr = useMemo(() => parseBanglaAddress(student.address), [student.address]);
  const admissionDate = useMemo(() => formatBanglaDate(student.created_at), [student.created_at]);
  const classText = useMemo(() => formatClassShort(student.class_name), [student.class_name]);
  const sectionText = useMemo(() => formatSectionOrDivision(student), [student]);

  const guardianName = student.guardian_name || student.father_name || "";
  const guardianRel = student.guardian_relation || (student.father_name ? "পিতা" : "");
  const guardianOcc = student.guardian_occupation || student.father_occupation || "";
  const guardianPhone = student.phone || "";
  const programName = student.batch_name || "সাধারণ প্রোগ্রাম";
  const rawLogo = !logoError ? logoUrl || "/logo.png" : null;
  const resolvedLogo = useTrimmedLogo(rawLogo);
  const resolvedPhoto = !photoError && student.photo_key ? `/api/files/${student.photo_key}` : null;
  const safeBgUrl = useMemo(() => sanitizeBgUrl(bgUrl), [bgUrl]);

  const containerStyle: React.CSSProperties | undefined = safeBgUrl
    ? {
        backgroundImage: `url("${safeBgUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  return (
    <div className="af-root af-a4-container" style={containerStyle}>
      <div className="af-border-box">
        <div>
          <div className="af-header">
            <div className="af-logo-slot">
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt="বিজ্ঞান পণ্ডিত টিউটর সেন্টার"
                  className="af-logo-top"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <h2 style={{ margin: 0, color: "#1e824c", fontSize: "24px", fontWeight: "bold" }}>
                  বিজ্ঞান পণ্ডিত টিউটর সেন্টার
                </h2>
              )}
            </div>
            <div className="af-sub-address-bar">
              সজীব ভিলা, সলঙ্গা রোড, বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ।
            </div>
          </div>

          <div className="af-form-title-row">
            <div>
              ভর্তি ক্রমিক নং: <span style={{ fontWeight: "normal" }}>{formatSerial(student.id)}</span>
            </div>
            <div className="af-form-title-badge">ভর্তি ফর্ম</div>
            <div>
              তারিখ: <span style={{ fontWeight: "normal" }}>{admissionDate}</span>
            </div>
          </div>

          <div className="af-info-card-blue">
            <div className="af-form-grid">
              <div className="af-fields-column">
                <div className="af-field-row">
                  <span className="af-field-label">শিক্ষার্থীর নাম</span> &nbsp;:
                  <span className="af-dots-fill">{student.name || "\u00A0"}</span>
                </div>
                <div className="af-field-row">
                  <span className="af-field-label">পিতার নাম</span> &nbsp;:
                  <span className="af-dots-fill">{student.father_name || "\u00A0"}</span>
                  <span className="af-field-label" style={{ marginLeft: "6px" }}>
                    পেশা:
                  </span>
                  <span className="af-dots-fill">{student.father_occupation || "\u00A0"}</span>
                </div>
                <div className="af-field-row">
                  <span className="af-field-label">মাতার নাম</span> &nbsp;:
                  <span className="af-dots-fill">{student.mother_name || "\u00A0"}</span>
                  <span className="af-field-label" style={{ marginLeft: "6px" }}>
                    পেশা:
                  </span>
                  <span className="af-dots-fill">{student.mother_occupation || "\u00A0"}</span>
                </div>
                <div className="af-field-row">
                  <span className="af-field-label">অধ্যায়নরত প্রতিষ্ঠান</span> &nbsp;:
                  <span className="af-dots-fill">{student.school_name || "\u00A0"}</span>
                </div>
                <div className="af-field-row">
                  <span className="af-field-label">শ্রেণি</span> &nbsp;:
                  <span className="af-dots-fill">{classText || "\u00A0"}</span>
                  <span className="af-field-label" style={{ marginLeft: "6px" }}>
                    শাখা/বিভাগ:
                  </span>
                  <span className="af-dots-fill">{sectionText || "\u00A0"}</span>
                </div>
              </div>
              <div className="af-photo-box">
                {resolvedPhoto ? (
                  <img
                    src={resolvedPhoto}
                    alt={student.name}
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <span>ছবি</span>
                )}
              </div>
            </div>
          </div>

          <div className="af-info-card-pink">
            <div className="af-section-divider">ঠিকানা</div>
            <div className="af-field-row">
              <span className="af-field-label">গ্রাম:</span>{" "}
              <span className="af-dots-fill">{addr.village || "\u00A0"}</span>
              <span className="af-field-label" style={{ marginLeft: "6px" }}>
                ডাকঘর:
              </span>{" "}
              <span className="af-dots-fill">{addr.postOffice || "\u00A0"}</span>
              <span className="af-field-label" style={{ marginLeft: "6px" }}>
                উপজেলা:
              </span>{" "}
              <span className="af-dots-fill">{addr.upazila || "\u00A0"}</span>
              <span className="af-field-label" style={{ marginLeft: "6px" }}>
                জেলা:
              </span>{" "}
              <span className="af-dots-fill">{addr.district || "\u00A0"}</span>
            </div>
          </div>

          <div className="af-info-card-green">
            <div className="af-section-divider">যোগাযোগ</div>
            <div className="af-field-row">
              <span className="af-field-label">অভিভাবকের নাম:</span>{" "}
              <span className="af-dots-fill">{guardianName || "\u00A0"}</span>
              <span className="af-field-label" style={{ marginLeft: "10px" }}>
                সম্পর্ক:
              </span>{" "}
              <span className="af-dots-fill">{guardianRel || "\u00A0"}</span>
            </div>
            <div className="af-field-row" style={{ marginTop: "2px" }}>
              <span className="af-field-label">পেশা:</span>{" "}
              <span className="af-dots-fill">{guardianOcc || "\u00A0"}</span>
              <span className="af-field-label" style={{ marginLeft: "10px" }}>
                অভিভাবকের মোবাইল নম্বর:
              </span>{" "}
              <span className="af-dots-fill">{guardianPhone || "\u00A0"}</span>
            </div>
          </div>

          <div className="af-terms-card">
            <div style={{ fontWeight: "bold", color: "#b71c1c", marginBottom: "2px" }}>
              📌 আমাদের কিছু শর্তাবলী:
            </div>
            <ol>
              <li>
                নিয়মিত ক্লাসে উপস্থিত থাকতে হবে। খুবই গুরুত্বপূর্ণ কাজ ব্যতিত ক্লাসে অনুপস্থিত থাকা যাবে না।
              </li>
              <li>
                প্রতিটি পরীক্ষায় অংশগ্রহণ করতে হবে। পরপর দুইটি পরীক্ষায় অংশগ্রহণ না করলে ভর্তি বাতিল করা হবে।
              </li>
              <li>মেয়েদের পূর্ণাঙ্গ পর্দার সহিত আসতে হবে। এখানে কোন অজুহাত গ্রহণযোগ্য নয়।</li>
              <li>ক্লাস চলাকালীন কোন ধরনের হট্টগোল, বিশৃঙ্খলা ইত্যাদি করা যাবে না।</li>
              <li>
                আমাদের কোচিং সম্পূর্ণ রাজনীতি মুক্ত। সুতরাং যেকোনো প্রকার রাজনৈতিক কথাবার্তা বা কাজকর্ম সম্পূর্ণ নিষিদ্ধ।
              </li>
              <li>
                আমাদের অঙ্গন ইসলামিক নিয়মনীতি অনুসরণ করে চলবে। সুতরাং যেকোনো প্রকারের অ-ইসলামিক কার্যক্রম এখানে নিষিদ্ধ।
              </li>
            </ol>
            <div style={{ marginTop: "3px", fontWeight: "bold" }}>
              ☐ আমি (শিক্ষার্থী) উপরে উল্লেখিত সকল শর্তাবলী মেনে নিলাম।
            </div>
          </div>

          <div className="af-signatures-row">
            <div className="af-sig-box-wrapper">
              <div className="af-sig-box-container" />
              <span className="af-sig-title">অভিভাবকের স্বাক্ষর</span>
            </div>
            <div className="af-sig-box-wrapper">
              <div className="af-sig-box-container">
                {adminSigUrl ? <img src={adminSigUrl} alt="ভর্তিকারীর স্বাক্ষর" className="af-sig-img" /> : null}
              </div>
              <span className="af-sig-title">ভর্তিকারীর স্বাক্ষর</span>
            </div>
          </div>
        </div>

        <div>
          <div className="af-cut-line">
            <span className="af-cut-line-icon">✂</span>
          </div>
          <div className="af-student-copy-card">
            <div className="af-student-copy-left">
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt="বিজ্ঞান পণ্ডিত"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <strong style={{ color: "#1e824c", fontSize: "18px" }}>বিজ্ঞান পণ্ডিত</strong>
              )}
              <div className="af-address-text">
                সজীব ভিলা, সলঙ্গা রোড, বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ।
              </div>
              <div className="af-contact-text">মোবাইল: 01568964703</div>
            </div>
            <div className="af-student-copy-right">
              <div className="af-stub-info-grid">
                <div>
                  <strong>নামঃ</strong> {student.name}
                </div>
                <div>
                  <strong>শ্রেণীঃ</strong> {classText}
                </div>
                <div>
                  <strong>ভর্তিরোলঃ</strong> {toBanglaNum(student.roll)}
                </div>
                <div>
                  <strong>বিভাগ/শাখাঃ</strong> {sectionText}
                </div>
                <div>
                  <strong>ভর্তিকৃত পোগ্রামঃ</strong> {programName}
                </div>
                <div>
                  <strong>অভিভাবকঃ</strong> {guardianName}
                </div>
              </div>
              <div className="af-stub-signature-area">
                <div className="af-stub-sig-line">
                  {adminSigUrl ? (
                    <img src={adminSigUrl} alt="ভর্তিকারীর স্বাক্ষর" className="af-stub-sig-img" />
                  ) : null}
                  ভর্তিকারীর স্বাক্ষর
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentAdmissionPrintDialog({
  student,
  onClose,
  role,
}: {
  student: AdmissionPrintableStudent | null;
  onClose: () => void;
  role: "ADMIN" | "TEACHER" | "DIRECTOR";
}) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [clearingBg, setClearingBg] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [directors, setDirectors] = useState<DirectorSigOption[]>([]);
  const [selectedSig, setSelectedSig] = useState<string>("none");
  const [mounted, setMounted] = useState(false);

  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.45);

  const canManageBg = role === "ADMIN" || role === "DIRECTOR";

  useEffect(() => {
    setMounted(true);
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!student) return;
    let active = true;

    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (active && json?.ok) {
          setLogoUrl(json.logoUrl || null);
          setBgUrl(json.admissionFormBgUrl || null);
        }
      })
      .catch(() => {});

    if (role === "ADMIN" || role === "DIRECTOR") {
      fetch("/api/admin/directors")
        .then((r) => r.json())
        .then((json) => {
          if (active && json?.ok && Array.isArray(json.directors)) {
            const withSigs = (json.directors as DirectorSigOption[]).filter((d) => Boolean(d.signature_key));
            setDirectors(withSigs);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [student, role]);

  useEffect(() => {
    if (!student || !previewEl) return;
    const update = () => {
      const style = window.getComputedStyle(previewEl);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const innerWidth = Math.max(240, previewEl.clientWidth - padX);
      setScale(Math.min(1, innerWidth / A4_PREVIEW_WIDTH_PX));
    };
    update();
    const raf = requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    ro.observe(previewEl);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [student, previewEl]);

  if (!student) return null;

  const selectedDirector = directors.find((d) => String(d.id) === selectedSig);
  const adminSigUrl = selectedDirector?.signature_key
    ? `/api/files/${selectedDirector.signature_key}`
    : null;

  const handleBgUpload = async (file: File) => {
    if (!canManageBg || !file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "ছবিটি অনেক বড় (সর্বোচ্চ ১৫ MB)।", variant: "destructive" });
      return;
    }

    const previousBg = bgUrl;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const localPreview = URL.createObjectURL(file);
    blobUrlRef.current = localPreview;
    setBgUrl(localPreview);
    setUploadingBg(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "admission-bg");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.url) {
        throw new Error(json?.error || "ব্যাকগ্রাউন্ড আপলোড করা যায়নি।");
      }
      setBgUrl(json.url);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      toast({ title: "ভর্তি ফর্মের ব্যাকগ্রাউন্ড স্থায়ীভাবে সংরক্ষণ করা হয়েছে!" });
    } catch (e) {
      setBgUrl(previousBg);
      toast({
        title: e instanceof Error ? e.message : "ব্যাকগ্রাউন্ড আপলোড ব্যর্থ হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleClearBg = async () => {
    if (!canManageBg || clearingBg) return;
    setClearingBg(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionFormBgUrl: "" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "ব্যাকগ্রাউন্ড সরানো যায়নি।");
      }
      setBgUrl(null);
      toast({ title: "ভর্তি ফর্মের ব্যাকগ্রাউন্ড সরানো হয়েছে (ডিফল্ট সাদা)।" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "ব্যাকগ্রাউন্ড সরানো যায়নি।",
        variant: "destructive",
      });
    } finally {
      setClearingBg(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ADMISSION_FORM_CSS }} />

      <Dialog open={Boolean(student)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="no-print w-[96vw] max-w-[96vw] sm:max-w-4xl max-h-[94vh] flex flex-col p-3 sm:p-5 rounded-2xl overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-slate-200 pb-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6 min-w-0">
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                  ভর্তি ফর্ম প্রিন্ট প্রিভিউ — {student.name}
                </DialogTitle>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  A4 Portrait ফরম্যাট • প্রিন্ট ডায়ালগে Margins: None এবং Background graphics চালু রাখুন
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canManageBg && (
                  <>
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleBgUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingBg}
                      onClick={() => bgInputRef.current?.click()}
                      className="h-9 gap-1.5 border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold px-3"
                    >
                      {uploadingBg ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      {bgUrl ? "ব্যাকগ্রাউন্ড পরিবর্তন" : "ব্যাকগ্রাউন্ড সেট"}
                    </Button>
                    {bgUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={clearingBg}
                        onClick={handleClearBg}
                        className="h-9 gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold px-2.5"
                        title="ব্যাকগ্রাউন্ড রিসেট করে সাদা করুন"
                      >
                        {clearingBg ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        রিসেট
                      </Button>
                    )}
                  </>
                )}
                {directors.length > 0 && (
                  <Select value={selectedSig} onValueChange={setSelectedSig}>
                    <SelectTrigger className="h-9 w-44 text-xs bg-white">
                      <SelectValue placeholder="স্বাক্ষর নির্বাচন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">স্বাক্ষর ছাড়া (হাতে স্বাক্ষর)</SelectItem>
                      {directors.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          স্বাক্ষর: {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrint}
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  প্রিন্ট করুন (A4)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 gap-1 px-3 text-xs font-semibold"
                >
                  <X className="h-3.5 w-3.5" />
                  বন্ধ
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div
            ref={setPreviewEl}
            className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden bg-slate-200/80 rounded-xl p-2 sm:p-4 mt-2"
          >
            <div
              className="mx-auto shadow-md bg-white overflow-hidden"
              style={{
                width: `${A4_PREVIEW_WIDTH_PX * scale}px`,
                height: `${A4_PREVIEW_HEIGHT_PX * scale}px`,
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: `${A4_PREVIEW_WIDTH_PX}px`,
                  height: `${A4_PREVIEW_HEIGHT_PX}px`,
                }}
              >
                <AdmissionFormSheet
                  key={`preview-${student.id}`}
                  student={student}
                  logoUrl={logoUrl}
                  bgUrl={bgUrl}
                  adminSigUrl={adminSigUrl}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {mounted &&
        createPortal(
          <div id="admissionPrintArea">
            <AdmissionFormSheet
              key={`print-${student.id}`}
              student={student}
              logoUrl={logoUrl}
              bgUrl={bgUrl}
              adminSigUrl={adminSigUrl}
            />
          </div>,
          document.body
        )}
    </>
  );
}
