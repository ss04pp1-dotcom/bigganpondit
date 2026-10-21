import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { APP_TITLE, DEFAULT_ACADEMY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${APP_TITLE} — ${DEFAULT_ACADEMY_NAME}`,
    template: `%s — ${APP_TITLE}`,
  },
  description:
    "বিজ্ঞান পণ্ডিত একাডেমি — পূর্ণাঙ্গ কোচিং ও একাডেমি ম্যানেজমেন্ট সিস্টেম, ক্লাস রুটিন, ব্যাচ ট্র্যাকিং ও রেজাল্ট পোর্টাল।",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "বিজ্ঞান পণ্ডিত",
  },
  openGraph: {
    title: "BigganPondit Academy",
    description:
      "বিজ্ঞান পণ্ডিত একাডেমি — পূর্ণাঙ্গ কোচিং ও একাডেমি ম্যানেজমেন্ট সিস্টেম, ক্লাস রুটিন, ব্যাচ ট্র্যাকিং ও রেজাল্ট পোর্টাল।",
    type: "website",
    images: ["/api/logo"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BigganPondit Academy",
    description:
      "বিজ্ঞান পণ্ডিত একাডেমি — পূর্ণাঙ্গ কোচিং ও একাডেমি ম্যানেজমেন্ট সিস্টেম, ক্লাস রুটিন, ব্যাচ ট্র্যাকিং ও রেজাল্ট পোর্টাল।",
    images: ["/api/logo"],
  },
  icons: {
    icon: [
      { url: "/api/logo", sizes: "any" },
      { url: "/api/logo?size=192", sizes: "192x192", type: "image/png" },
      { url: "/api/logo?size=512", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/api/logo",
    apple: [
      { url: "/api/logo", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/api/logo" />
        <link rel="apple-touch-icon-precomposed" href="/api/logo" />
        <link rel="shortcut icon" href="/api/logo" />
        <link rel="icon" href="/api/logo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="বিজ্ঞান পণ্ডিত" />
        <meta name="application-name" content="বিজ্ঞান পণ্ডিত" />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
