"use client";

import React, { useEffect, useState, useRef } from "react";

interface TransparentSignatureProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

// In-memory cache for processed signature data URLs to avoid re-running canvas math
const signatureCache = new Map<string, string>();

/**
 * Removes white / near-white background from uploaded signature images,
 * converting them into true transparent PNGs with seamless blending so no white box or border is visible.
 */
export function TransparentSignature({
  src,
  alt,
  className = "",
  style = {},
  ...props
}: TransparentSignatureProps) {
  const [cleanSrc, setCleanSrc] = useState<string>(() => signatureCache.get(src) || src);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!src) return;

    if (signatureCache.has(src)) {
      setCleanSrc(signatureCache.get(src)!);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (!w || !h) {
          if (mountedRef.current) setCleanSrc(src);
          return;
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          if (mountedRef.current) setCleanSrc(src);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Pixel processing: Detect paper white/grey background and set alpha to 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          // Perceived brightness
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          // Pure white or paper grey/cream background (brightness > 220)
          if (brightness >= 232) {
            data[i + 3] = 0; // 100% transparent
          } else if (brightness > 185) {
            // Smooth anti-aliased transition at ink edges so there are no jagged borders
            const factor = (232 - brightness) / (232 - 185);
            data[i + 3] = Math.round(a * Math.pow(factor, 1.25));
          } else {
            // Dark ink stroke - preserve color and ensure rich depth
            data[i + 3] = a;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL("image/png");

        signatureCache.set(src, transparentDataUrl);
        if (mountedRef.current) {
          setCleanSrc(transparentDataUrl);
        }
      } catch (err) {
        // Fallback to original image if cross-origin or canvas security throws
        if (mountedRef.current) setCleanSrc(src);
      }
    };

    img.onerror = () => {
      if (mountedRef.current) setCleanSrc(src);
    };

    img.src = src;

    return () => {
      mountedRef.current = false;
    };
  }, [src]);

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        background: "transparent",
        backgroundColor: "transparent",
        mixBlendMode: "multiply",
        filter: "contrast(135%) brightness(102%)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      {...props}
    />
  );
}
