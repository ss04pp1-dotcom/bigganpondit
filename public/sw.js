// Service Worker for Web Push (VAPID) & System Notifications
// বিজ্ঞান পণ্ডিত একাডেমি

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function resolveUrl(rawUrl) {
  if (!rawUrl) return "/dashboard";
  if (rawUrl === "notices") return "/notices";
  if (rawUrl === "routine") return "/routines";
  if (rawUrl === "results") return "/results";
  if (rawUrl === "profile") return "/profile";
  if (rawUrl === "home") return "/dashboard";
  if (typeof rawUrl === "string" && rawUrl.startsWith("/")) return rawUrl;
  return "/dashboard";
}

// Handle incoming FCM HTTP v1 & Web Push (VAPID) events (even when the PWA is closed in background)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const notif = data.notification || {};
    const customData = data.data || {};

    const title =
      data.title ||
      notif.title ||
      customData.title ||
      "বিজ্ঞান পণ্ডিত একাডেমি — নোটিফিকেশন";
    const body =
      data.body ||
      notif.body ||
      customData.body ||
      "আপনার জন্য একটি নতুন বার্তা রয়েছে।";
    const image = data.image || notif.image || customData.image || undefined;
    const targetUrl = resolveUrl(
      data.url ||
        data.deepLink ||
        customData.route ||
        customData.url ||
        notif.click_action ||
        data.fcmOptions?.link ||
        data.fcm_options?.link
    );
    const notifId = data.notificationId || customData.notificationId || null;

    const options = {
      body,
      icon: "/icons/icon-192.png?v=5",
      badge: "/icons/icon-192.png?v=5",
      ...(image ? { image } : {}),
      vibrate: [200, 100, 200],
      tag: data.tag || notif.tag || `bp-notif-${notifId || Date.now()}`,
      renotify: true,
      data: {
        url: targetUrl,
        notificationId: notifId,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("বিজ্ঞান পণ্ডিত একাডেমি", {
        body: text,
        icon: "/icons/icon-192.png?v=5",
        badge: "/icons/icon-192.png?v=5",
        data: { url: "/dashboard" },
      })
    );
  }
});

// Focus or open window on clicking notification and navigate to deep link
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              if ("navigate" in client && targetUrl) {
                await client.navigate(targetUrl);
              }
            } catch {
              // ignore navigation error
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
