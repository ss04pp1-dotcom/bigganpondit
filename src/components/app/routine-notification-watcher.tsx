"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  BellRing,
  Volume2,
  VolumeX,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // 2. Fetch today's user-specific routines
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
    const interval = setInterval(loadRoutines, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRoutines]);

  // Click handler on the notification bell: triggers native browser permission prompt directly
  const handleBellClick = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "ব্রাউজার সাপোর্ট করে না",
        description: "আপনার ব্রাউজারে সিস্টেম নোটিফিকেশন সুবিধা নেই।",
      });
      return;
    }

    if (Notification.permission !== "granted") {
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
        } else {
          toast({
            title: "অনুমতি দেওয়া হয়নি",
            description: "ব্রাউজার সেটিংস থেকে নোটিফিকেশন পারমিশন Allow করুন।",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.warn("Permission request error:", err);
      }
    } else {
      // Already granted - toggle sound mute state
      const nextMute = !soundMutedLocal;
      setSoundMutedLocal(nextMute);
      localStorage.setItem("bp_notif_sound_mute", nextMute ? "1" : "0");
      toast({
        title: nextMute ? "নোটিফিকেশন সাউন্ড মিউট করা হয়েছে" : "নোটিফিকেশন সাউন্ড চালু করা হয়েছে 🔔",
        description: `আজকের নির্ধারিত ক্লাস: ${routines.length} টি`,
      });
      if (!nextMute) {
        playNotificationChime("10min");
      }
    }
  };

  // 3. Background schedule checker for automatic class push notifications
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

    checkRoutines();
    const interval = setInterval(checkRoutines, 25000);
    return () => clearInterval(interval);
  }, [routines, soundMutedLocal, toast]);

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 relative border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
      onClick={handleBellClick}
      title={permission === "granted" ? "নোটিফিকেশন সচল আছে (সাউন্ড টগল করতে ক্লিক করুন)" : "ক্লাস নোটিফিকেশন চালু করতে ক্লিক করুন"}
    >
      <BellRing className={`h-4 w-4 ${permission === "granted" ? "text-emerald-600" : "text-amber-600 animate-pulse"}`} />
      {routines.length > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-2xs">
          {routines.length}
        </span>
      )}
    </Button>
  );
}
