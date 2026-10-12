// Service Worker for Class Routine Push & System Notifications
// বিজ্ঞান পণ্ডিত একাডেমি

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push event (if push server configured)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "বিজ্ঞান পণ্ডিত একাডেমি — ক্লাস নোটিফিকেশন";
    const options = {
      body: data.body || "আপনার পরবর্তী ক্লাসের সময় হয়েছে।",
      icon: "/api/logo",
      badge: "/api/logo",
      vibrate: [200, 100, 200],
      tag: data.tag || "class-routine-notif",
      renotify: true,
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("বিজ্ঞান পণ্ডিত একাডেমি", {
        body: text,
        icon: "/api/logo",
      })
    );
  }
});

// Focus or open window on clicking notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
