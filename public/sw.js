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

// Handle incoming Web Push event (even when the PWA is closed in background)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "বিজ্ঞান পণ্ডিত একাডেমি — নোটিফিকেশন";
    const targetUrl = resolveUrl(data.url || data.deepLink || data.data?.route);
    const options = {
      body: data.body || "আপনার জন্য একটি নতুন বার্তা রয়েছে।",
      icon: "/icons/icon-192.png?v=5",
      badge: "/icons/icon-192.png?v=5",
      ...(data.image ? { image: data.image } : {}),
      vibrate: [200, 100, 200],
      tag: data.tag || `bp-notif-${data.notificationId || Date.now()}`,
      renotify: true,
      data: {
        url: targetUrl,
        notificationId: data.notificationId || null,
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
