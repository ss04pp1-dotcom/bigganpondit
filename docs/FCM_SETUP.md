# FCM পুশ নোটিফিকেশন সেটআপ গাইড

এই সিস্টেমটি **তিন স্তরে** কাজ করে:

```
┌─────────────────┐   register token    ┌──────────────────────┐
│  Flutter অ্যাপ   │ ──────────────────▶ │  Cloudflare Worker    │
│  (FCM SDK)      │ ◀────────────────── │  (Next.js + OpenNext) │
└─────────────────┘   push via FCM v1   │  + D1 queue + Cron     │
                                      └──────────┬───────────┘
                                                 │ OAuth2 (service account)
                                                 ▼
                                       ┌──────────────────────┐
                                       │  Firebase Cloud       │
                                       │  Messaging (FCM)      │
                                       └──────────────────────┘
```

## কী কী হয়েছে (কোড)

| অংশ | ফাইল |
|---|---|
| D1 টেবিল: device_tokens, push_notifications (কিউ), push_deliveries (লগ), notification_inbox | `db/migrations/0016_push_notifications.sql` (+ `src/lib/db/index.ts` fast-path) |
| FCM HTTP v1 ক্লায়েন্ট (OAuth2 JWT RS256, Workers-compatible) | `src/lib/fcm.ts` |
| কিউ প্রসেসর: claim, idempotency, retry+backoff, recurrence, batch fanout | `src/lib/push-service.ts` |
| ইভেন্ট হুক: নোটিশ প্রকাশ / রুটিন আপডেট / ফলাফল প্রকাশ → অটো-এনকিউ | `src/lib/push-events.ts` + ৩টি route |
| ডিভাইস রেজিস্ট্রেশন API (অ্যাপ → সার্ভার) | `src/app/api/notifications/register|unregister|inbox/route.ts` |
| ক্রন প্রসেসর এন্ডপয়েন্ট (CRON_SECRET দিয়ে সুরক্ষিত) | `src/app/api/cron/push/route.ts` |
| অ্যাডমিন API (compose/schedule/cancel/retry) | `src/app/api/admin/notifications/**` |
| অ্যাডমিন প্যানেল UI | `src/app/admin/notifications/page.tsx` |
| Cron Triggers (প্রতি মিনিট) | `wrangler.toml` `[triggers]` |
| Worker `scheduled()` হ্যান্ডলার ইনজেকশন | `scripts/patch-worker.mjs` |

## সেটআপ ধাপ (একবারই করতে হয়)

### ১. Firebase প্রজেক্ট ✅ সম্পন্ন (v4.1.0)

1. https://console.firebase.google.com → **Add project**
2. Project settings → **Cloud Messaging** চালু আছে কিনা দেখুন
3. **Android অ্যাপ যোগ করুন** — package name: `bd.bigganpondit.academy`
4. `google-services.json` ডাউনলোড করুন

→ প্রজেক্ট `bigganpondit` তৈরি হয়েছে, Android অ্যাপ রেজিস্টার্ড, আর
`google-services.json` এখন APK-র ভেতরেই বেকড (v4.1.0+)। এই ধাপ আর করতে
হবে না।

### ২. অ্যাপ কনফিগার ✅ সম্পন্ন (v4.1.0)

`google-services.json` অ্যাপের `app/` ফোল্ডারে বসানো হয়েছে +
google-services Gradle প্লাগইন যোগ করা হয়েছে — APK বানানোর সময়ই
classic Firebase ইনিশিয়ালাইজেশন হয় (নেটওয়ার্ক ছাড়াই, নির্ভরযোগ্য)।
রানটাইম ফলব্যাক (`/api/push/config`) রক্ষণাবেক্ষণের জন্য রয়ে গেছে।

### ৩. সার্ভার সিক্রেট ⬅ এখন শুধু এটাই বাকি

```bash
# Firebase Console → Project Settings → Service Accounts →
# "Generate new private key" → JSON ফাইল নামান → পুরো JSON পেস্ট করুন:
bunx wrangler secret put FCM_SERVICE_ACCOUNT

# ক্রন এন্ডপয়েন্টের জন্য র‍্যান্ডম সিক্রেট (একবার সেট থাকলে আর নয়):
openssl rand -hex 24
bunx wrangler secret put CRON_SECRET
```

ফোন থেকেও করা যায় (wrangler ছাড়াই): **Cloudflare Dashboard →
Workers → academy-marks-system → Settings → Variables and Secrets →
Add → Type: Secret** → নাম `FCM_SERVICE_ACCOUNT`, ভ্যালুতে পুরো JSON
পেস্ট → Save। `CRON_SECRET`-ও একইভাবে (Type: Secret)।

দ্রুততম সমাধান: ফোনে Firebase Console (console.firebase.google.com) →
Project Settings (⚙️) → Service Accounts → **Generate new private key** →
ফাইলটি খুলে পুরো কনটেন্ট কপি → Cloudflare Dashboard-এ পেস্ট।

### ৩-খ। পাবলিক Firebase ভ্যারিয়েবল ✅ সম্পন্ন (2026-10-15)

চারটি **পাবলিক** ভ্যারিয়েবল (`FIREBASE_API_KEY`, `FIREBASE_APP_ID`,
`FIREBASE_PROJECT_ID`, `FIREBASE_SENDER_ID`) এখন `wrangler.toml`-এর
`[vars]`-এ সেট করা এবং প্রোডাকশনে ডিপ্লয় হয়ে গেছে —
`/api/push/config` এখন `"enabled":true` দেখায়। ড্যাশবোর্ডে আর কিছু সেট
করতে হবে না।

### ৪. ডিপ্লয়

```bash
bun run build:cf          # OpenNext build + patch-worker.mjs (scheduled handler inject)
bunx wrangler d1 migrations apply academy-marks --remote   # migration 0016
bunx wrangler deploy      # cron trigger সহ ডিপ্লয় হবে
```

`wrangler.toml`-এ `APP_URL` ঠিক আছে কিনা যাচাই করুন (cron handler এই URL-এই
`/api/cron/push` ডাকে)।

### ৫. যাচাই

- অ্যাপে লগইন করুন → অ্যাডমিন প্যানেলে **পুশ নোটিফিকেশন** পেজে "সক্রিয় ডিভাইস" সংখ্যা বাড়বে
- একটি নোটিফিকেশন বানিয়ে "এখনই পাঠান" → "এখনই প্রসেস করুন" চাপুন
- ফোনে নোটিফিকেশন আসবে; ট্যাপ করলে সংশ্লিষ্ট পেজে যাবে (ডিপ-লিংক)

## নির্ভরযোগ্যতা নকশা

- **কিউ D1-তে** — Worker রিস্টার্ট/ডিপ্লয়েও জমা থাকে, মেমোরিতে নয়
- **Cron প্রতি মিনিটে** (v4.1.0 থেকে) — নির্ধারিত নোটিফিকেশন ~১ মিনিটের
  মধ্যে যায় + Worker আইসোলেট উষ্ণ থাকে (কোল্ড-স্টার্ট ~৫সে → বিরল)
- **Claim-guarded** — দুটি ওভারল্যাপিং ক্রন একই নোটিফিকেশন দুবার পাঠাতে পারে না
- **Idempotency key** — নোটিশ/রুটিন/ফলাফল ইভেন্ট রিট্রাই হলেও ডুপ্লিকেট পুশ হয় না
- **Retry + backoff** — ৩০সে × ২ⁿ, সর্বোচ্চ ৫ বার; তারপর terminal FAILED
- **Invalid token cleanup** — FCM 404/UNREGISTERED হলে টোকেন deactivate
- **Bounded batch** — প্রতি রানে ২৫টি নোটিফিকেশন × ৫০০ ডিভাইস
- **"SENT" মানে** FCM গ্রহণ করেছে — ডিভাইসে দেখানো নিশ্চিত নয় (FCM receipt
  exposure নেই); এজন্যই অ্যাপে notification_inbox হিস্ট্রি আছে

## সমস্যা হলে

| উপসর্গ | কারণ / সমাধান |
|---|---|
| অ্যাডমিন প্যানেলে "FCM কনফিগার করা হয়নি" | `FCM_SERVICE_ACCOUNT` সিক্রেট সেট হয়নি |
| নোটিফিকেশন PENDING-এ আটকে | cron চলছে না — `wrangler tail` দেখুন; APP_URL/CRON_SECRET যাচাই করুন |
| অ্যাপে পুশ আসে না কিন্তু ডিভাইস নিবন্ধিত | অ্যাপে notification permission দেওয়া হয়নি, বা ফোনে Google Play Services নেই |
| Token বারবার বদলায় | স্বাভাবিক — onTokenRefresh সার্ভারে আপডেট করে দেয় |
