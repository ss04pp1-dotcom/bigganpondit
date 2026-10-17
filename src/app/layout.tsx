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
  openGraph: {
    title: "BigganPondit Academy",
    description: "বিজ্ঞান পণ্ডিত একাডেমি — পূর্ণাঙ্গ কোচিং ও একাডেমি ম্যানেজমেন্ট সিস্টেম, ক্লাস রুটিন, ব্যাচ ট্র্যাকিং ও রেজাল্ট পোর্টাল।",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BigganPondit Academy",
    description: "বিজ্ঞান পণ্ডিত একাডেমি — পূর্ণাঙ্গ কোচিং ও একাডেমি ম্যানেজমেন্ট সিস্টেম, ক্লাস রুটিন, ব্যাচ ট্র্যাকিং ও রেজাল্ট পোর্টাল।",
  },
  icons: {
    icon: "/api/logo",
    shortcut: "/api/logo",
    apple: "/api/logo",
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
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
