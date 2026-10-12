"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Send,
  CheckCircle2,
  Shield,
  X,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_NOTIF_10MIN_TITLE,
  DEFAULT_NOTIF_10MIN_MSG,
  DEFAULT_NOTIF_START_TITLE,
  DEFAULT_NOTIF_START_MSG,
} from "@/lib/constants";
import {
  parseTimeToMinutes,
  getCurrentDhakaMinutes,
  getDhakaDateString,
  formatRoutineMessage,
  playNotificationChime,
  RoutineMessageContext,
} from "@/lib/routine-notifications";
import { RoutineItem } from "@/components/app/today-routine-modal";

const SAMPLE_ROUTINE: RoutineMessageContext = {
  subject: "পদার্থবিজ্ঞান",
  class_name: "১০",
  start_time: "10:00 AM",
  end_time: "11:00 AM",
  room_no: "২০২",
  teacher_name: "মো: রফিকুল ইসলাম",
  period: "১ম পিরিয়ড",
  division: "SCIENCE",
};

export function RoutineNotificationWatcher({
  userRole,
}: {
  userRole: string;
}) {
  const { toast } = useToast();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [soundMutedLocal, setSoundMutedLocal] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bp_notif_sound_mute") === "1";
  });

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // 1. Register service worker for reliable system background notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          swRegistrationRef.current = reg;
        })
        .catch((err) => {
          console.debug("ServiceWorker registration skipped:", err);
        });
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // 2. Automatically request permission on website visit if not yet granted
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Check if permission is default (neither granted nor denied)
    if (Notification.permission === "default") {
      const timer = setTimeout(() => {
        // Attempt native prompt
        try {
          Notification.requestPermission().then((perm) => {
            setPermission(perm);
            if (perm === "granted") {
              playNotificationChime("start");
            }
          }).catch(() => {
            // Some mobile browsers require explicit user click
          });
        } catch {
          // ignore
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // 3. Fetch today's user-specific routines
  const loadRoutines = useCallback(async () => {
    try {
      const res = await fetch("/api/routines?todayOnly=1").catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.routines)) {
          setRoutines(json.routines);
        }
      }
    } catch (err) {
      console.debug("Failed to load routine data:", err);
    }
  }, []);

  useEffect(() => {
    loadRoutines();
    // Refresh routine list periodically (every 5 minutes)
    const interval = setInterval(loadRoutines, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRoutines]);

  // Request browser notification permission explicitly on click
  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "ব্রাউজার সাপোর্ট করে না",
        description: "আপনার ব্রাউজারে সিস্টেম নোটিফিকেশন সুবিধা নেই, তবে ওয়েবসাইটে থাকা অবস্থায় ইন-অ্যাপ অ্যালার্ট কাজ করবে।",
      });
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "granted") {
        toast({
          title: "নোটিফিকেশন সক্রিয় হয়েছে! 🔔",
          description: "ক্লাস শুরুর ১০ মিনিট আগে এবং ক্লাস শুরুর মুহূর্তে স্বয়ংক্রিয় নোটিফিকেশন পাবেন।",
          className: "bg-emerald-600 text-white border-none",
        });
        playNotificationChime("start");
      } else if (perm === "denied") {
        toast({
          title: "নোটিফিকেশন অনুমতি ব্লক করা আছে",
          description: "ব্রাউজার সেটিংস থেকে নোটিফিকেশন পারমিশন Allow করুন।",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.warn("Permission request error:", err);
    }
  };

  // Toggle user sound mute
  const toggleSoundMute = () => {
    const next = !soundMutedLocal;
    setSoundMutedLocal(next);
    localStorage.setItem("bp_notif_sound_mute", next ? "1" : "0");
    if (!next) {
      playNotificationChime("10min");
    }
  };

  // Trigger test notification
  const handleTestNotification = async () => {
    if (!soundMutedLocal) {
      playNotificationChime("start");
    }

    const testTitle = formatRoutineMessage(DEFAULT_NOTIF_START_TITLE, SAMPLE_ROUTINE);
    const testBody = formatRoutineMessage(DEFAULT_NOTIF_START_MSG, SAMPLE_ROUTINE);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          if (swRegistrationRef.current && "showNotification" in swRegistrationRef.current) {
            swRegistrationRef.current.showNotification(testTitle, {
              body: testBody,
              icon: "/api/logo",
              badge: "/api/logo",
              tag: "test-notif",
              vibrate: [200, 100, 200],
            } as NotificationOptions);
          } else {
            new Notification(testTitle, {
              body: testBody,
              icon: "/api/logo",
            });
          }
        } catch {
          // ignore
        }
      }
    }

    toast({
      title: testTitle,
      description: testBody,
      className: "border-emerald-400 bg-emerald-50 text-emerald-950 font-medium shadow-lg",
    });
  };

  // 4. Background schedule checker
  useEffect(() => {
    if (routines.length === 0) return;

    function checkRoutines() {
      const currentMinutes = getCurrentDhakaMinutes();
      const todayDate = getDhakaDateString();
      const soundAllowed = !soundMutedLocal;

      for (const routine of routines) {
        const startMinutes = parseTimeToMinutes(routine.start_time);
        if (startMinutes === null) continue;

        // TRIGGER 1: 10 MINUTES BEFORE
        const tenMinTrigger = startMinutes - 10;
        if (currentMinutes >= tenMinTrigger && currentMinutes < startMinutes) {
          const key = `bp_notif_${routine.id}_${todayDate}_10min`;
          const alreadySent = localStorage.getItem(key);

          if (!alreadySent) {
            localStorage.setItem(key, "1");

            const title = formatRoutineMessage(DEFAULT_NOTIF_10MIN_TITLE, routine);
            const body = formatRoutineMessage(DEFAULT_NOTIF_10MIN_MSG, routine);

            if (soundAllowed) {
              playNotificationChime("10min");
            }

            dispatchSystemNotification(title, body);

            toast({
              title,
              description: body,
              className: "border-amber-300 bg-amber-50 text-amber-950 font-medium shadow-lg",
            });
          }
        }

        // TRIGGER 2: AT CLASS START TIME
        if (currentMinutes >= startMinutes && currentMinutes <= startMinutes + 4) {
          const key = `bp_notif_${routine.id}_${todayDate}_start`;
          const alreadySent = localStorage.getItem(key);

          if (!alreadySent) {
            localStorage.setItem(key, "1");

            const title = formatRoutineMessage(DEFAULT_NOTIF_START_TITLE, routine);
            const body = formatRoutineMessage(DEFAULT_NOTIF_START_MSG, routine);

            if (soundAllowed) {
              playNotificationChime("start");
            }

            dispatchSystemNotification(title, body);

            toast({
              title,
              description: body,
              className: "border-emerald-400 bg-emerald-50 text-emerald-950 font-medium shadow-lg",
            });
          }
        }
      }
    }

    function dispatchSystemNotification(title: string, body: string) {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      try {
        if (swRegistrationRef.current && "showNotification" in swRegistrationRef.current) {
          swRegistrationRef.current.showNotification(title, {
            body,
            icon: "/api/logo",
            badge: "/api/logo",
            tag: `class-${Date.now()}`,
            vibrate: [200, 100, 200],
          } as NotificationOptions);
        } else {
          new Notification(title, {
            body,
            icon: "/api/logo",
          });
        }
      } catch (err) {
        console.debug("Failed to dispatch system notification:", err);
      }
    }

    // Run check immediately, then every 25 seconds
    checkRoutines();
    const interval = setInterval(checkRoutines, 25000);
    return () => clearInterval(interval);
  }, [routines, soundMutedLocal, toast]);

  return (
    <>
      {/* Automatic Notification Permission Request Banner (if permission not yet granted) */}
      {permission === "default" && !promptDismissed && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                <BellRing className="h-5 w-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs sm:text-sm font-bold text-white">
                  ক্লাস নোটিফিকেশন চালু করুন 🔔
                </h5>
                <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                  ক্লাসের ১০ মিনিট আগে এবং ক্লাস শুরুর সময়ে সরাসরি ফোন/ব্রাউজারে অটোমেটিক বিজ্ঞপ্তি পেতে অনুমতি দিন।
                </p>
                <div className="flex items-center gap-2 pt-1.5">
                  <Button
                    size="sm"
                    onClick={requestPermission}
                    className="h-7 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                  >
                    অনুমতি দিন
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPromptDismissed(true)}
                    className="h-7 px-2 text-[11px] text-emerald-200 hover:text-white hover:bg-white/10"
                  >
                    পরে
                  </Button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPromptDismissed(true)}
              className="text-emerald-300/70 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Topbar Notification Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 relative border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            title="ক্লাস রুটিন নোটিফিকেশন"
          >
            <BellRing className="h-4 w-4 text-emerald-600" />
            {routines.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-2xs">
                {routines.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-xl border-slate-200">
          <div className="p-3.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-emerald-300" />
                <h4 className="text-xs font-bold text-white">ক্লাস পুশ নোটিফিকেশন</h4>
              </div>
              <Badge className="bg-white/20 text-white text-[10px] font-bold border-none">
                স্বয়ংক্রিয়
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-100 mt-1">
              ক্লাসের ১০ মিনিট আগে এবং শুরুর সময়ে অটোমেটিক নোটিফিকেশন আসবে
            </p>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Browser Permission Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  ব্রাউজার নোটিফিকেশন
                </span>
                <p className="text-[10px] text-slate-500">
                  {permission === "granted"
                    ? "অনুমতি দেওয়া আছে (সক্রিয়)"
                    : permission === "denied"
                    ? "ব্রাউজারে ব্লক করা"
                    : "অনুমতি প্রয়োজন"}
                </p>
              </div>

              {permission !== "granted" ? (
                <Button
                  size="sm"
                  onClick={requestPermission}
                  className="h-7 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-2.5"
                >
                  চালু করুন
                </Button>
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
            </div>

            {/* Quick sound toggle */}
            <div className="flex items-center justify-between py-1 px-1 text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                {soundMutedLocal ? (
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
                নোটিফিকেশন অডিও সাউন্ড
              </span>
              <button
                type="button"
                onClick={toggleSoundMute}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                {soundMutedLocal ? "চালু করুন" : "মিউট করুন"}
              </button>
            </div>

            {/* Routine summary */}
            <div className="border-t border-slate-100 pt-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span className="font-medium">আজকের নির্ধারিত ক্লাস:</span>
                <span className="font-bold text-slate-900">{routines.length} টি</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {routines.length > 0
                  ? "রুটিনের নির্ধারিত সময় অনুযায়ী ব্রাউজারে ও স্ক্রিনে অটো নোটিফিকেশন পাবেন।"
                  : "আজকের জন্য কোনো ক্লাস নির্ধারিত নেই।"}
              </p>
            </div>

            {/* Test Notification Trigger */}
            <div className="border-t border-slate-100 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="w-full text-xs font-bold gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 h-8"
              >
                <Send className="h-3.5 w-3.5" />
                টেস্ট নোটিফিকেশন চেক করুন
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
