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
| Cron Triggers (প্রতি ৫ মিনিট) | `wrangler.toml` `[triggers]` |
| Worker `scheduled()` হ্যান্ডলার ইনজেকশন | `scripts/patch-worker.mjs` |

## সেটআপ ধাপ (একবারই করতে হয়)

### ১. Firebase প্রজেক্ট

1. https://console.firebase.google.com → **Add project**
2. Project settings → **Cloud Messaging** চালু আছে কিনা দেখুন
3. **Android অ্যাপ যোগ করুন** — package name: `bd.bigganpondit.academy`
4. `google-services.json` ডাউনলোড করুন

### ২. Flutter অ্যাপ কনফিগার

`lib/core/fcm_config.dart` ফাইলে `google-services.json`-এর ভ্যালু বসান:

```dart
const bool kFcmEnabled = true;

const FirebaseOptions kAndroidFirebaseOptions = FirebaseOptions(
  apiKey: 'AIza...',            // google-services.json → api_key.current_key
  appId: '1:123:android:abc',   // client[0].mobilesdk_app_id
  messagingSenderId: '123',     // project_info.project_number
  projectId: 'your-project',    // project_info.project_id
);
```

তারপর APK রিবিল্ড করুন। `kFcmEnabled = false` থাকলে অ্যাপ FCM ছাড়াই
লোকাল নোটিফিকেশনে চলে (graceful degradation)।

### ৩. সার্ভার সিক্রেট

```bash
# Firebase Console → Project Settings → Service Accounts →
# "Generate new private key" → JSON ফাইল নামান → পুরো JSON পেস্ট করুন:
bunx wrangler secret put FCM_SERVICE_ACCOUNT

# ক্রন এন্ডপয়েন্টের জন্য র‍্যান্ডম সিক্রেট:
openssl rand -hex 24
bunx wrangler secret put CRON_SECRET
```

### ৩-খ। অ্যাপের জন্য পাবলিক Firebase ভ্যারিয়েবল (WebView APK-তে রিবিল্ড ছাড়াই FCM চালু)

Android WebView অ্যাপটি (bd.bigganpondit.academy) চালু হওয়ার সময়
`GET /api/push/config` থেকে এই ৪টি **পাবলিক** ভ্যারিয়েবল পড়ে নিজে নিজে
Firebase ইনিশিয়ালাইজ করে। ভ্যারিয়েবল সেট করার সাথে সাথেই (পরের লঞ্চ থেকে)
পুশ চালু হয়ে যায় — **APK আবার বানানোর দরকার নেই।**
Cloudflare Dashboard → Workers → academy-marks-system → Settings →
Variables and Secrets → Add variable (Type: Text — এগুলো সিক্রেট নয়):

| Variable | মান কোথায় পাবেন (Firebase Console) |
|---|---|
| `FIREBASE_API_KEY` | Project Settings → General → Web API Key (`AIza...`) |
| `FIREBASE_APP_ID` | Project Settings → আপনার Android অ্যাপ (`1:123...:android:abc...`) |
| `FIREBASE_PROJECT_ID` | Project Settings → General → Project ID |
| `FIREBASE_SENDER_ID` | Project Settings → Cloud Messaging → Sender ID |

যাচাই: `https://<আপনার-সাইট>/api/push/config` → `"enabled":true` দেখালেই তৈরি।

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
- **Cron প্রতি ৫ মিনিটে** — নির্ধারিত সময়ের আগে-পরে হলেও overdue জব প্রসেস হয়
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
