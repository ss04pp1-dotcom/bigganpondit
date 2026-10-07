# ডিপ্লয়মেন্ট গাইড — Cloudflare Workers + D1 + R2

এই অ্যাপ্লিকেশনটি Cloudflare-এ চালানোর জন্য ডিজাইন করা হয়েছে:
**Next.js (OpenNext) → Cloudflare Workers → D1 (SQLite) + R2 (ফাইল)**।
কোনো VPS, MySQL, MongoDB বা আলাদা Node সার্ভারের প্রয়োজন নেই।

## ১. প্রয়োজনীয় জিনিস

- Cloudflare অ্যাকাউন্ট
- Node.js 22+ / Bun
- `bun install` (প্যাকেজ ইনস্টল)

## ২. D1 ডাটাবেস তৈরি

```bash
bunx wrangler d1 create academy-marks
```

আউটপুটে পাওয়া `database_id` টি `wrangler.toml`-এ `[[d1_databases]]` অংশে বসান।

## ৩. R2 বাকেট তৈরি

```bash
bunx wrangler r2 bucket create academy-assets
```

## ৪. সিক্রেট সেট করুন (একবারই)

```bash
bunx wrangler secret put AUTH_SECRET      # দীর্ঘ র‍্যান্ডম স্ট্রিং
bunx wrangler secret put ADMIN_USERNAME   # প্রাথমিক প্রশাসক ইউজারনেম
bunx wrangler secret put ADMIN_PASSWORD   # প্রাথমিক প্রশাসক পাসওয়ার্ড (সংগ্রহস্থলে কখনো লিখবেন না)
```

> প্রাথমিক প্রশাসক অ্যাকাউন্ট প্রথম বুটে এই env থেকে তৈরি হয় (সিকিউর সিড)।
> `DEMO_HINT` ভেরিয়েবলটি প্রোডাকশনে `0` রাখুন যাতে লগইন পেজে ডেমো তথ্য না দেখায়।

## ৫. GitHub Actions স্বয়ংক্রিয় ডিপ্লয়মেন্ট (CI/CD)

আপনার রিপোজিটরির `.github/workflows/deploy.yml` ফাইলে অটো-ডিপ্লয়মেন্ট কনফিগার করা হয়েছে। এটি সক্রিয় করতে:

1. **GitHub Secrets যোগ করুন:**
   GitHub Repo > **Settings > Secrets and variables > Actions** এ গিয়ে নিচের ২টি সিক্রেট যোগ করুন:
   - `CLOUDFLARE_API_TOKEN`: Cloudflare Dashboard (My Profile > API Tokens > "Edit Cloudflare Workers" টেমপ্লেট থেকে তৈরি করুন)।
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Dashboard-এর ডান পাশের কলামে পাওয়া Account ID।

2. **D1 ডাটাবেস ও ID বসানো:**
   Cloudflare Dashboard বা টার্মিনালে D1 তৈরি করে প্রাপ্ত `database_id` টি `wrangler.toml` ফাইলে বসিয়ে দিন:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "academy-marks"
   database_id = "আপনার_আসল_D1_DATABASE_ID"
   ```

3. **পুশ বা রান:**
   `main` ব্রাঞ্চে কোনো পুশ হলে অথবা GitHub Actions ট্যাবে গিয়ে **"Run workflow"** ক্লিক করলেই স্বয়ংক্রিয়ভাবে বিল্ড হয়ে Cloudflare Workers-এ লাইভ হয়ে যাবে।

## ৬. ম্যানুয়াল বিল্ড ও ডিপ্লয় (টার্মিনাল থেকে)

```bash
# D1 মাইগ্রেশন (db/migrations/0001_init.sql)
bunx wrangler d1 migrations apply academy-marks --remote

# বিল্ড + ডিপ্লয় (OpenNext)
bun run build:cf
bunx wrangler deploy
```

## ৭. লোকাল ডেভেলপমেন্ট

```bash
bun run dev          # http://localhost:3000
```

লোকাল মোডে D1-সামঞ্জস্যপূর্ণ SQLite অ্যাডাপ্টার (`db/academy.db`) ও R2-সামঞ্জস্যপূর্ণ
ফাইলসিস্টেম অ্যাডাপ্টার (`.storage/r2/`) ব্যবহৃত হয় — প্রোডাকশনে একই কোড আসল
D1/R2 বাইন্ডিং-এ চলে। `.env` ও `.dev.vars` লোকাল কনফিগের জন্য।

## ৭. ডেমো/প্রাথমিক অ্যাকাউন্ট (লোকাল প্রিভিউ)

- প্রশাসক: `admin / Admin@123` (`.env` থেকে)
- শিক্ষক: `rakibul / 0092`, `mehedi / 2732`
- শিক্ষার্থী: `student01` … `student24` / `1234`

## ৮. আর্কিটেকচার

```
Internet → Cloudflare Network → Next.js + Workers (OpenNext)
                ├─ Auth (PBKDF2 + D1 sessions, HttpOnly cookie)
                ├─ D1 (users/teachers/students/classes/subjects/teacher_subjects/exams/marks/settings/sessions)
                ├─ R2 (academy/logos | signatures | students | backups — অথেনটিকেটেড /api/files/* দিয়ে সরবরাহ)
                └─ Result Engine (single module: percentage/grade/GPA/highest/aggregation/ranking)
```

সব অনুমতি যাচাই সার্ভার-সাইডে (D1 `teacher_subjects` + ownership চেক)।
শিক্ষার্থী অন্যের তথ্য URL/আইডি বদলে কখনো দেখতে পারে না (IDOR সুরক্ষিত)।
