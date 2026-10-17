# Fixed build notes

This package is a fixed revision of the supplied Biggan Pondit project.

## Medium-issue hardening (round 2 — 30 fixes)

### API security & scoping
- CSRF origin check fails CLOSED on malformed Origin (`Origin: null`, `https://`) instead of silently passing.
- `/api/logo` serves only the `academy/logos/` prefix, and `PUT /api/settings` validates logo keys — a DIRECTOR can no longer point the public logo endpoint at an admin-only R2 backup file.
- `GET /api/notebooks` requires a real session (the proxy only checked that a `sid` cookie EXISTS — any fabricated value leaked notebook metadata).
- `GET /api/attendance` and `GET /api/attendance/sheet` enforce teacher-class scoping (previously any teacher could read every student's phone/photo for any class); sheet validates month/year ranges.
- `GET /api/students` returns an EMPTY list for teachers with no assigned classes (was: entire school PII).
- `GET /api/marks?checkExam=1` enforces teacher subject scoping like every other marks branch.
- Image uploads validate strictly by magic bytes (no client-declared MIME fallback).
- `academy/requests/` photos are actually served (the files route had no handler for the prefix — previews always 404'd), scoped to admin/director/teacher-of-class.
- Notebook delete removes the orphaned R2 object.

### Durable rate limiting & account recovery
- New D1-backed rate limiter (`login_attempts` table, migration 0011) replaces the per-isolate in-memory Map that was ineffective on Workers. Login locks after 8 failures/5 min; reveals lock after 5.
- OTP verification caps at 5 wrong attempts with a 15-minute lockout.
- `forgot-password` no longer returns the internal `userId` and returns one generic response for unknown accounts / no-email / provider-not-configured (account enumeration removed); requests are throttled per IP.
- `reset-password` identifies the user by username.
- `POST /api/admin/students/[id]/reveal-password` requires the ADMIN's own password (the frontend "fingerprint verification" was a fake 650ms spinner — the dialog is now a real password re-entry, rate-limited).
- Password resets/change invalidate all existing sessions (reveal-PATCH, change-password, OTP reset — previously stolen sessions outlived resets).

### Backup / storage
- Restore pre-validates the ENTIRE payload (row shape, ids, roles, statement cap) BEFORE deleting anything; failures can no longer leave a wiped-and-half-restored DB.
- Automatic pre-restore safety snapshot is created and reported on every restore; the client requires typing `RESTORE` to confirm and surfaces network errors.
- Backup now includes `password_resets` and `password_change_requests` (previously cascade-wiped on restore, silently losing pending requests), and restores `exam_type` + `is_published` (previously every restored exam reverted to draft — ALL student results vanished after a restore).
- Fixed restore DELETE order: `subjects` must be deleted before `classes` (FK violation mid-restore).
- `bucket.put()` throws when nothing was durably persisted (R2 + D1 fallback + disk all failed) — backups can no longer "succeed" into per-isolate memory.
- `storage_chunks` column drift fixed (code wrote `chunk_idx`, migration DBs have `chunk_index`; writes now work on both shapes, and bootstrap renames legacy columns).
- Evicted backups (registry cap 20) are deleted from R2 instead of accumulating as orphans.

### Destructive operations & infra
- "Clear demo data" removes ONLY seeder-created accounts (tracked ids + legacy username pattern) — it previously deleted ALL marks, ALL exams, ALL student_requests and EVERY student, production data included. Runs in one atomic batch.
- Teacher deletion no longer 500s on FK enforcement (notices/notebooks/attendance references SET NULL; migration 0012 rebuilds the three tables with proper ON DELETE actions) and cleans up R2 photo/signature objects.
- Missing D1 binding in Workers now fails fast with a clear error instead of serving a fake success-returning stub database.
- Bootstrap schema steps log unexpected errors loudly (only "already exists" style errors are ignored); initial admin is NOT created in Workers without the ADMIN_PASSWORD secret (no more admin/admin123 first boot).
- `wrangler.toml` preview environment uses its own D1/R2 placeholders instead of silently writing live production data.
- Schema parity: `login_attempts`, `password_*`, `storage_chunks`, `hide_photo_from_students` added to the embedded schema; `UserRow.role` includes DIRECTOR.

### Result & reporting correctness
- THE official GPA formula (compulsory average + best-4th bonus + fail cap) is exported from the engine and reused by the merit list and class summaries — the merit list previously showed a percentage-based GPA (e.g. GPA 4.00 on the merit list vs 0.00 on the report card for the same student).
- Official result cards: no more identical canned teacher comments on every card (blank boxes to hand-write); no `.catch(() => null)` swallowing DB errors mid-print-batch; absent students are no longer double-charged (absence fine + fail fine for the same missed exam); a PRESENT student with a legitimate 0 is never inferred "absent" and fined; annual `fine: "০০/-"` displays as zero instead of triggering auto-computation.
- Annual report pages: per-month grade column shows THAT month's grade (was: the annual overall grade repeated 12 times); real per-subject class-highest (was: full marks, implying the student always scored 100%); grade scale comes from `gradeFromPercentage` instead of duplicated inline tables.
- Attendance "today" is computed in Asia/Dhaka (UTC+6) — submitting between 00:00–05:59 local time no longer counts the current local date as a "future date".
- SMS: BD phone numbers are normalized (Bengali digits, +880/880 prefixes) and validated server-side; invalid numbers are reported back (`skippedCount`) instead of silently dropped; the "বাছাইকৃত (SELECTED)" scope has real student checkboxes (the button previously could never succeed).
- Marks entry (single mode) blocks blank saves — an untouched student was silently stored as PRESENT with 0 marks.
- pdf.js document is destroyed on unmount/book-switch via a ref (the stale-closure cleanup never ran — every book open leaked a full document).

## Security fixes
- Teacher result queries now reject explicitly requested subjects outside the teacher permission set.
- Teacher queries with zero subject permissions no longer fall back to all subjects.
- Student edit validates class/division consistency server-side.

## Result/report fixes
- Monthly individual reports now include each exam row followed by the subject aggregate.
- Shared result calculations remain centralized.

## Student management
- Student creation now returns the new student ID and the UI can upload a photo immediately after creation.

## Dependency cleanup
- Removed unused Prisma and NextAuth runtime dependencies from package.json; this project uses D1 and its own Worker-compatible session layer.

## v3 follow-up fixes
- Student edit no longer fails when the password field is left blank (password is omitted from the PATCH payload).
- Pending student photo preview now uses a memoized object URL that is revoked on change/unmount (no leak).
- Photo upload after student creation is wrapped in try/catch with a 5 MB client-side check; ImageUpload revokes its temporary object URL.
- Removed stray tsconfig.tsbuildinfo from the package.
- NOTE: bun.lock still lists Prisma/NextAuth; run `bun install` once to regenerate it.

## Verification
- Source-level review completed.
- A full Cloudflare production build should be run after installing dependencies in a network-enabled environment.
