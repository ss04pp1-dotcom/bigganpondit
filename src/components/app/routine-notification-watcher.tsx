"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Volume2,
  VolumeX,
  CheckCircle2,
  Bell,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
} from "@/lib/routine-notifications";
import { RoutineItem } from "@/components/app/today-routine-modal";

interface InboxItem {
  id: number;
  notification_id: number;
  title: string;
  body: string;
  deep_link: string | null;
  kind: string;
  is_read: number;
  created_at: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getOrCreateDeviceId(): string {
  const key = "bp_push_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `pwa-${crypto.randomUUID()}`
        : `pwa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function resolveDeepLink(deepLink?: string | null): string {
  switch (deepLink) {
    case "notices":
      return "/notices";
    case "routine":
      return "/routines";
    case "results":
      return "/results";
    case "profile":
      return "/profile";
    case "home":
      return "/dashboard";
    default:
      if (deepLink && deepLink.startsWith("/")) return deepLink;
      return "/dashboard";
  }
}

export function RoutineNotificationWatcher({
  userRole,
}: {
  userRole: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [pushRegistered, setPushRegistered] = useState<boolean>(false);
  const [soundMutedLocal, setSoundMutedLocal] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bp_notif_sound_mute") === "1";
  });

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const syncingRef = useRef<boolean>(false);

  const dispatchSystemNotification = useCallback(
    (title: string, body: string, tag?: string, url?: string) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      try {
        if (swRegistrationRef.current && "showNotification" in swRegistrationRef.current) {
          swRegistrationRef.current.showNotification(title, {
            body,
            icon: "/icons/icon-192.png?v=5",
            badge: "/icons/icon-192.png?v=5",
            tag: tag || `bp-notif-${Date.now()}`,
            vibrate: [200, 100, 200],
            data: { url: url || "/dashboard" },
          } as NotificationOptions);
        } else {
          new Notification(title, {
            body,
            icon: "/icons/icon-192.png?v=5",
            tag: tag || `bp-notif-${Date.now()}`,
          });
        }
      } catch (err) {
        console.debug("Failed to dispatch system notification:", err);
      }
    },
    []
  );

  // Subscribe browser/PWA to Web Push (VAPID) and register token in D1 `device_tokens`
  const syncWebPushSubscription = useCallback(async () => {
    if (typeof window === "undefined" || syncingRef.current) return false;
    if (!("Notification" in window) || Notification.permission !== "granted") return false;

    syncingRef.current = true;
    try {
      const deviceId = getOrCreateDeviceId();
      let tokenToRegister = `local-pwa:${deviceId}`;

      if ("serviceWorker" in navigator) {
        const reg =
          swRegistrationRef.current ||
          (await navigator.serviceWorker.register("/sw.js").catch(() => null));
        if (reg) {
          swRegistrationRef.current = reg;
          await navigator.serviceWorker.ready.catch(() => null);

          if ("pushManager" in reg) {
            const vapidRes = await fetch("/api/push/vapid").catch(() => null);
            const vapidJson = vapidRes?.ok ? await vapidRes.json().catch(() => null) : null;
            const publicKey: string | undefined = vapidJson?.publicKey;

            if (publicKey) {
              let sub = await reg.pushManager.getSubscription().catch(() => null);
              const savedKey = localStorage.getItem("bp_vapid_pub_key");
              if (sub && savedKey && savedKey !== publicKey) {
                await sub.unsubscribe().catch(() => null);
                sub = null;
              }
              if (!sub) {
                const appServerKey = urlBase64ToUint8Array(publicKey);
                sub = await reg.pushManager
                  .subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: appServerKey as BufferSource,
                  })
                  .catch(() => null);
              }
              if (sub) {
                localStorage.setItem("bp_vapid_pub_key", publicKey);
                tokenToRegister = JSON.stringify(sub.toJSON());
              }
            }
          }
        }
      }

      const regRes = await fetch("/api/notifications/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenToRegister,
          deviceId,
          platform: "web",
          appVersion: "pwa-1.0",
        }),
      }).catch(() => null);

      if (regRes?.ok) {
        setPushRegistered(true);
        return true;
      }
      return false;
    } catch (err) {
      console.debug("WebPush registration skipped:", err);
      return false;
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // 1. Register service worker and auto-sync subscription if permission is already granted
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          swRegistrationRef.current = reg;
          if ("Notification" in window && Notification.permission === "granted") {
            syncWebPushSubscription();
          }
        })
        .catch((err) => {
          console.debug("ServiceWorker registration skipped:", err);
        });
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, [syncWebPushSubscription]);

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

  // 3. Poll notification inbox for new admin/notice/result/routine pushes
  const checkInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/inbox").catch(() => null);
      if (!res || !res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json?.ok || !Array.isArray(json.notifications)) return;

      const items: InboxItem[] = json.notifications;
      setInbox(items);
      setUnreadCount(Number(json.unread ?? 0));

      const unreadItems = items.filter((i) => i.is_read === 0);
      const newlyArrivedIds: number[] = [];

      for (const item of unreadItems) {
        const seenKey = `bp_inbox_seen_${item.id}`;
        if (!localStorage.getItem(seenKey)) {
          localStorage.setItem(seenKey, "1");
          newlyArrivedIds.push(item.id);

          if (!soundMutedLocal) {
            playNotificationChime("start");
          }

          const targetUrl = resolveDeepLink(item.deep_link);
          dispatchSystemNotification(
            item.title,
            item.body,
            `bp-push-${item.notification_id}`,
            targetUrl
          );

          toast({
            title: item.title,
            description: item.body,
            className: "border-emerald-400 bg-emerald-50 text-emerald-950 font-medium shadow-lg",
          });
        }
      }

      if (newlyArrivedIds.length > 0) {
        await fetch("/api/notifications/inbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: newlyArrivedIds }),
        }).catch(() => null);
        setUnreadCount((prev) => Math.max(0, prev - newlyArrivedIds.length));
      }
    } catch {
      // ignore
    }
  }, [dispatchSystemNotification, soundMutedLocal, toast]);

  useEffect(() => {
    loadRoutines();
    checkInbox();
    const routineInterval = setInterval(loadRoutines, 5 * 60 * 1000);
    const inboxInterval = setInterval(checkInbox, 20 * 1000);
    return () => {
      clearInterval(routineInterval);
      clearInterval(inboxInterval);
    };
  }, [loadRoutines, checkInbox]);

  const requestAndEnablePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "ব্রাউজার সাপোর্ট করে না",
        description: "আপনার ব্রাউজারে সিস্টেম নোটিফিকেশন সুবিধা নেই।",
      });
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "granted") {
        await syncWebPushSubscription();
        toast({
          title: "পুশ নোটিফিকেশন সক্রিয় হয়েছে! 🔔",
          description: "এখন অ্যাপ বন্ধ থাকলেও নোটিশ, রুটিন ও ফলাফলের নোটিফিকেশন পাবেন।",
          className: "bg-emerald-600 text-white border-none",
        });
        playNotificationChime("start");
      } else {
        toast({
          title: "অনুমতি দেওয়া হয়নি",
          description: "ব্রাউজার বা অ্যাপ সেটিংস থেকে নোটিফিকেশন পারমিশন Allow করুন।",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.warn("Permission request error:", err);
    }
  };

  // Click handler on the notification bell
  const handleBellClick = async () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      await requestAndEnablePush();
      return;
    }
    if (!pushRegistered) {
      syncWebPushSubscription();
    }
    setDrawerOpen(true);
    // Mark all read when opening inbox modal
    if (unreadCount > 0) {
      fetch("/api/notifications/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
        .then(() => setUnreadCount(0))
        .catch(() => null);
    }
  };

  const toggleSoundMute = () => {
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
  };

  // 4. Background schedule checker for automatic class push notifications
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

            dispatchSystemNotification(title, body, `class-10m-${routine.id}-${todayDate}`, "/routines");

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

            dispatchSystemNotification(title, body, `class-start-${routine.id}-${todayDate}`, "/routines");

            toast({
              title,
              description: body,
              className: "border-emerald-400 bg-emerald-50 text-emerald-950 font-medium shadow-lg",
            });
          }
        }
      }
    }

    checkRoutines();
    const interval = setInterval(checkRoutines, 25000);
    return () => clearInterval(interval);
  }, [routines, soundMutedLocal, toast, dispatchSystemNotification]);

  const badgeCount = unreadCount > 0 ? unreadCount : routines.length;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 relative border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
        onClick={handleBellClick}
        title={
          permission === "granted"
            ? "নোটিফিকেশন ও ইনবক্স দেখুন"
            : "পুশ নোটিফিকেশন চালু করতে ক্লিক করুন"
        }
      >
        <BellRing
          className={`h-4 w-4 ${
            permission === "granted" ? "text-emerald-600" : "text-amber-600 animate-pulse"
          }`}
        />
        {badgeCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${
              unreadCount > 0 ? "bg-rose-600 animate-bounce" : "bg-emerald-600"
            }`}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </Button>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
                নোটিফিকেশন ও অ্যালার্ট
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSoundMute}
                className="h-8 gap-1.5 text-xs"
              >
                {soundMutedLocal ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-rose-500" /> সাউন্ড বন্ধ
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> সাউন্ড চালু
                  </>
                )}
              </Button>
            </DialogTitle>
            <DialogDescription>
              {permission === "granted" ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> এই ডিভাইসে পুশ নোটিফিকেশন সক্রিয় আছে
                </span>
              ) : (
                "অ্যাপ বন্ধ থাকলেও নোটিফিকেশন পেতে নিচের বাটনে ক্লিক করে অনুমতি দিন।"
              )}
            </DialogDescription>
          </DialogHeader>

          {permission !== "granted" && (
            <Button onClick={requestAndEnablePush} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <BellRing className="h-4 w-4 mr-2" /> পুশ নোটিফিকেশন চালু করুন
            </Button>
          )}

          <div className="space-y-2 mt-2">
            {inbox.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-slate-50/50">
                কোনো নতুন নোটিফিকেশন নেই।
                {routines.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-700 font-medium">
                    আজ আপনার নির্ধারিত ক্লাস রয়েছে: {routines.length} টি
                  </p>
                )}
              </div>
            ) : (
              inbox.slice(0, 25).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push(resolveDeepLink(item.deep_link));
                  }}
                  className="cursor-pointer rounded-lg border p-3 hover:bg-slate-50 transition-colors space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.body}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
