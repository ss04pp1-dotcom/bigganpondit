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
    "বিজ্ঞান পণ্ডিত একাডেমি — নম্বর সংগ্রহক ও রিপোর্ট সফটওয়্যার। পরীক্ষার নম্বর সংগ্রহ, ফলাফল গণনা, মেধা তালিকা ও মাসিক/বার্ষিক রিপোর্ট।",
  icons: { icon: "/logo.svg" },
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
