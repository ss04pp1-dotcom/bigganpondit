#!/usr/bin/env python3
"""Smoke tests for the MEDIUM-severity fixes (run against `next start -p 3001`)."""
import json, urllib.request, http.cookiejar, sys, time, datetime

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"
passed, failed = [], []

def check(name, cond, detail=""):
    (passed if cond else failed).append((name, detail))
    print(("PASS" if cond else "FAIL"), "-", name, ("| " + str(detail)[:160] if detail and not cond else ""))
    return cond

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def req(self, method, path, body=None, headers=None, raw_body=None):
        h = {"Content-Type": "application/json", **(headers or {})}
        data = raw_body if raw_body is not None else (json.dumps(body).encode() if body is not None else None)
        r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
        try:
            res = self.opener.open(r)
            raw = res.read()
            try:
                parsed = json.loads(raw.decode() or "{}")
            except Exception:
                parsed = {"_raw": raw[:200]}
            return res.status, parsed, dict(res.headers)
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                parsed = json.loads(raw.decode() or "{}")
            except Exception:
                parsed = {"_raw": raw[:200]}
            return e.code, parsed, dict(e.headers)

def login(username, password):
    c = Client()
    st, j, _ = c.req("POST", "/api/auth/login", {"username": username, "password": password})
    return (c if st == 200 and j.get("ok") else None), st, j

NOW = datetime.date.today()
TODAY = NOW.isoformat()
CUR_MONTH, CUR_YEAR = NOW.month, NOW.year

# ================================================================ 0. logins
admin, st, j = login("admin", "admin123")
check("admin login", admin is not None, (st, j))
student01, st, j = login("student01", "1234")
check("student01 (demo) login", student01 is not None, (st, j))

# ================================================================ 1. notebooks auth
st, j, _ = Client().req("GET", "/api/notebooks")
check("notebooks GET without session -> 401", st == 401, (st, j))
garbage = Client()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(garbage.jar))
# fabricate a sid cookie without ever logging in
r = urllib.request.Request(BASE + "/api/notebooks")
garbage.jar.add_cookie_header(r)
class FakePolicy(http.cookiejar.DefaultCookiePolicy):
    pass
cj = http.cookiejar.CookieJar()
cj.set_cookie(http.cookiejar.Cookie(0, "sid", "totallyfakevalue", None, False, "localhost", False, False, "/", False, False, None, False, None, None, {}))
fake = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
req = urllib.request.Request(BASE + "/api/notebooks")
try:
    res = fake.open(req)
    st2, j2 = res.status, json.loads(res.read().decode() or "{}")
except urllib.error.HTTPError as e:
    st2, j2 = e.code, json.loads(e.read().decode() or "{}")
check("notebooks GET with fabricated sid cookie -> 401", st2 == 401, (st2, j2))
st, j, _ = student01.req("GET", "/api/notebooks")
check("notebooks GET with real session -> 200", st == 200 and j.get("ok"), (st, j))

# ================================================================ 2. CSRF fail-closed
raw = Client()
try:
    st, j, _ = raw.req("POST", "/api/auth/login", {"username": "admin", "password": "admin123"}, headers={"Origin": "null"})
except Exception as e:
    st, j = -1, {"err": str(e)}
check("login with Origin: null rejected (CSRF fail-closed)", st == 403, (st, j))
try:
    st, j, _ = raw.req("POST", "/api/auth/login", {"username": "admin", "password": "admin123"}, headers={"Origin": "https://"})
except Exception:
    st = -1
check("login with malformed Origin rejected", st == 403, (st, j))

# ================================================================ 3. setup ids
st, j, _ = admin.req("GET", "/api/classes")
classes = {c["name"]: c["id"] for c in j.get("classes", [])}
check("classes list", st == 200 and "10" in classes and "7" in classes, classes)
C10, C7 = classes.get("10"), classes.get("7")

st, j, _ = admin.req("GET", "/api/admin/subjects")
subs = j.get("subjects", [])
sub10 = next((s for s in subs if s["class_name"] == "10"), None)
sub7 = next((s for s in subs if s["class_name"] == "7"), None)
check("subjects fetched", sub10 is not None and sub7 is not None, subs[:2])

# ================================================================ 4. attendance validation
st, j, _ = admin.req("GET", f"/api/attendance/sheet?classId={C7}&month=13&year={CUR_YEAR}")
check("attendance sheet month=13 -> 400", st == 400, (st, j))
st, j, _ = admin.req("GET", f"/api/attendance/sheet?classId={C7}&month=0&year={CUR_YEAR}")
check("attendance sheet month=0 -> 400", st == 400, (st, j))
future = (NOW + datetime.timedelta(days=3)).isoformat()
st, j, _ = admin.req("POST", "/api/attendance", {"classId": C7, "date": future, "entries": []})
check("attendance future date -> 400", st == 400, (st, j))

# ================================================================ 5. unassigned / scoped teachers
st, j, _ = admin.req("POST", "/api/admin/teachers", {
    "name": "নো পার্মিশন টিচার", "username": "noperm_t", "password": "test1234",
    "shortName": "NP", "subjectIds": [],
})
check("create unassigned teacher", st in (200, 201) and j.get("ok"), (st, j))
st, j, _ = admin.req("POST", "/api/admin/teachers", {
    "name": "স্কোপড টিচার", "username": "scoped_t", "password": "test1234",
    "shortName": "SC", "subjectIds": [sub10["id"]],
})
check("create class-10-only teacher", st in (200, 201) and j.get("ok"), (st, j))
st, j, _ = admin.req("POST", "/api/admin/teachers", {
    "name": "এফকে টিচার", "username": "fkt_t", "password": "test1234",
    "shortName": "FK", "subjectIds": [sub7["id"]],
})
check("create class-7 teacher (FK test)", st in (200, 201) and j.get("ok"), (st, j))

noperm, st, j = login("noperm_t", "test1234")
check("unassigned teacher login", noperm is not None, (st, j))
scoped, st, j = login("scoped_t", "test1234")
check("scoped teacher login", scoped is not None, (st, j))

st, j, _ = noperm.req("GET", "/api/students")
check("unassigned teacher students GET -> EMPTY list (fail-closed)", st == 200 and j.get("students") == [], (st, j.get("students", "N/A") if isinstance(j.get("students"), list) else (st, j)))
st, j, _ = noperm.req("GET", f"/api/attendance?classId={C7}")
check("unassigned teacher attendance GET -> 403", st == 403, (st, j))
st, j, _ = noperm.req("GET", f"/api/attendance/sheet?classId={C7}")
check("unassigned teacher attendance sheet -> 403", st == 403, (st, j))

st, j, _ = scoped.req("GET", f"/api/attendance?classId={C7}")
check("scoped teacher attendance GET other class -> 403", st == 403, (st, j))
st, j, _ = scoped.req("GET", f"/api/attendance?classId={C10}")
check("scoped teacher attendance GET own class -> 200", st == 200 and j.get("ok"), (st, j))
st, j, _ = scoped.req("GET", f"/api/attendance/sheet?classId={C10}&month={CUR_MONTH}&year={CUR_YEAR}")
check("scoped teacher attendance sheet own class -> 200", st == 200 and j.get("ok"), (st, j))

# checkExam branch scoping: scoped teacher (class-10 subject only) asks about
# a class-7 exam. The demo seeder created exams for every class-7 subject with
# the same month/year/title, so sub7 + the first class-7 exam's month/year/title
# resolves to a real exam for a subject the scoped teacher does NOT own.
st, j, _ = admin.req("GET", "/api/marks?class=7&limit=5")
exams7 = j.get("exams", [])
if exams7:
    e = exams7[0]
    from urllib.parse import urlencode
    qs = urlencode({
        "checkExam": "1", "classId": C7, "division": "", "subjectId": sub7["id"],
        "month": e["month"], "year": e["year"], "title": e["title"], "examType": "MONTHLY",
    })
    st, j, _ = scoped.req("GET", "/api/marks?" + qs)
    check("marks checkExam as non-subject teacher -> 403", st == 403, (st, j))
else:
    check("marks checkExam as non-subject teacher -> 403 (skipped: no class-7 exam)", True, "skip")

# ================================================================ 6. login brute force (durable D1 limiter)
# LOGIN_RATE limit=8: the 8th FAILURE engages the lockout (429 on that attempt).
admin.req("POST", "/api/students", {
    "name": "ব্রুট টেস্ট", "className": "7", "roll": 777,
    "username": "brutetest", "password": "test1234",
})
codes = []
for i in range(8):
    c = Client()
    st, j, _ = c.req("POST", "/api/auth/login", {"username": "brutetest", "password": "wrongpass"})
    codes.append(st)
check("first 7 wrong logins -> 401", all(s == 401 for s in codes[:7]), codes)
check("8th wrong login -> 429 (lockout engages)", codes[7] == 429, codes)
c = Client()
st, j, _ = c.req("POST", "/api/auth/login", {"username": "brutetest", "password": "test1234"})
check("9th attempt with CORRECT password still -> 429 (durable lock)", st == 429, (st, j))
st, j, _ = Client().req("POST", "/api/auth/login", {"username": "admin", "password": "admin123"})
check("admin unaffected by other user's lockout", st == 200 and j.get("ok"), (st, j))

# ================================================================ 7. forgot-password: no enumeration, no userId
c1 = Client(); st1, j1, _ = c1.req("POST", "/api/auth/forgot-password", {"usernameOrEmail": "doesnotexist_zzz"})
c2 = Client(); st2, j2, _ = c2.req("POST", "/api/auth/forgot-password", {"usernameOrEmail": "admin"})
check("forgot-password unknown user -> generic ok", st1 == 200 and j1.get("ok"), (st1, j1))
check("forgot-password existing user (no email) -> SAME generic ok", st2 == 200 and j2.get("ok") and j2.get("message") == j1.get("message"), (j1, j2))
check("forgot-password never returns userId", "userId" not in j1 and "userId" not in j2, (j1, j2))

# ================================================================ 8. OTP attempt cap
codes = []
for i in range(4):
    st, j, _ = Client().req("POST", "/api/auth/reset-password", {"username": "smokebadphone", "otp": "000000", "newPassword": "newpass123"})
    codes.append(st)
check("4 wrong OTPs -> 400", all(s == 400 for s in codes), codes)
st, j, _ = Client().req("POST", "/api/auth/reset-password", {"username": "smokebadphone", "otp": "000000", "newPassword": "newpass123"})
check("5th wrong OTP -> 429 (locked)", st == 429, (st, j))

# ================================================================ 9. reveal-password: admin password verification
st, j, _ = admin.req("GET", "/api/students?class=7&q=smokebadphone")
bad_students = [s for s in j.get("students", []) if s.get("username") == "smokebadphone"]
check("smokebadphone visible to admin", len(bad_students) == 1, j.get("students"))
BAD_SID = bad_students[0]["id"] if bad_students else None

bad_session, st, j = login("smokebadphone", "test1234")
check("smokebadphone login (pre-PATCH)", bad_session is not None, (st, j))

if BAD_SID:
    st, j, _ = admin.req("POST", f"/api/admin/students/{BAD_SID}/reveal-password", {})
    check("reveal without adminPassword -> 401", st == 401, (st, j))
    st, j, _ = admin.req("POST", f"/api/admin/students/{BAD_SID}/reveal-password", {"adminPassword": "WRONG"})
    check("reveal with wrong adminPassword -> 401", st == 401, (st, j))
    st, j, _ = admin.req("POST", f"/api/admin/students/{BAD_SID}/reveal-password", {"adminPassword": "admin123"})
    check("reveal with correct adminPassword -> 200 + password", st == 200 and j.get("passwordAvailable"), (st, j))
    # PATCH new password -> old session dies
    st, j, _ = admin.req("PATCH", f"/api/admin/students/{BAD_SID}/reveal-password", {"newPassword": "newpass123"})
    check("PATCH new student password -> 200", st == 200 and j.get("ok"), (st, j))
    st, j, _ = bad_session.req("GET", "/api/students")
    check("student's OLD session invalidated after reset", st == 401, (st, j))
    c, st, j = login("smokebadphone", "newpass123")
    check("student login with NEW password works", c is not None, (st, j))

# ================================================================ 10. settings logo-key hardening
st, j, _ = admin.req("PUT", "/api/settings", {"academyLogoKey": "academy/backups/backup-x.json"})
check("settings PUT logo key = backup path -> 400", st == 400, (st, j))
st, j, _ = admin.req("PUT", "/api/settings", {"academyLogoKey": "academy/students/9/x.png"})
check("settings PUT logo key = student path -> 400", st == 400, (st, j))
st, j, _ = admin.req("PUT", "/api/settings", {"academyLogoKey": "academy/logos/main-x.png"})
check("settings PUT valid logo key -> 200", st == 200 and j.get("ok"), (st, j))
st, j, _ = admin.req("PUT", "/api/settings", {"academyLogoKey": ""})
check("settings PUT clear logo -> 200", st == 200 and j.get("ok"), (st, j))

# ================================================================ 11. result cards: no canned comments + fine semantics
st, j, _ = admin.req("GET", f"/api/admin/result-cards?mode=MONTHLY&class=10&division=SCIENCE&month={CUR_MONTH}&year={CUR_YEAR}")
cards = j.get("cards", [])
check("monthly result cards load", st == 200 and len(cards) > 0, (st, len(cards)))
if cards:
    c0 = cards[0]
    check("monthly card has NO canned teacherComments", not c0.get("teacherComments"), c0.get("teacherComments"))
    check("monthly fine format includes taka", isinstance(c0.get("fine"), str) and ("৳" in c0["fine"] or c0["fine"] == "০০/-"), c0.get("fine"))
    has_att = all(isinstance(s.get("attendance"), str) for s in c0.get("subjects", []))
    check("monthly subjects carry explicit attendance", has_att, c0.get("subjects", [])[:1])
st, j, _ = admin.req("GET", f"/api/admin/result-cards?mode=ANNUAL&class=10&division=SCIENCE&year={CUR_YEAR}")
acards = j.get("cards", [])
check("annual result cards load", st == 200 and len(acards) > 0, (st, len(acards)))
if acards:
    a0 = acards[0]
    check("annual card fine is explicit zero (০০/-)", a0.get("fine") == "০০/-", a0.get("fine"))
    check("annual card has NO canned teacherComments", not a0.get("teacherComments"), a0.get("teacherComments"))
    check("annual card position is a real ordinal (not hardcoded ১ম for all)", any(c.get("position") != acards[0].get("position") for c in acards[1:]) or len(acards) == 1, [c.get("position") for c in acards][:6])

# ================================================================ 12. GPA consistency: merit list vs monthly card
st, j, _ = admin.req("GET", f"/api/results?type=merit&class=10&division=SCIENCE&month={CUR_MONTH}&year={CUR_YEAR}")
merit = j.get("merit", j.get("entries", []))
check("merit list loads", st == 200 and len(merit) > 0, (st, j if not merit else len(merit)))
if merit and cards:
    mismatches = []
    for m in merit[:5]:
        sid = m.get("studentId")
        st2, j2, _ = admin.req("GET", f"/api/results?type=monthly&studentId={sid}&month={CUR_MONTH}&year={CUR_YEAR}&class=10&division=SCIENCE")
        overall = (j2.get("report") or {}).get("overall") or j2.get("overall")
        if overall is None:
            continue
        if abs(float(m.get("gpa", 0)) - float(overall.get("gpa", 0))) > 0.005:
            mismatches.append((sid, m.get("gpa"), overall.get("gpa")))
    check("merit list GPA == monthly card GPA (same official formula)", len(mismatches) == 0, mismatches)

# ================================================================ 13. SMS: skipped-number reporting
# create a real student with a valid phone
st, j, _ = admin.req("POST", "/api/students", {
    "name": "রিয়েল স্মোক ওয়ান", "className": "7", "roll": 999,
    "username": "realsmoke1", "password": "test1234", "phone": "01712345678",
})
check("create real student with valid phone", st in (200, 201) and j.get("ok"), (st, j))
st, j, _ = admin.req("GET", "/api/students?class=7")
real = [s for s in j.get("students", []) if s.get("username") == "realsmoke1"]
REAL_SID = real[0]["id"] if real else None
check("real student found", REAL_SID is not None, j.get("students"))
if REAL_SID and BAD_SID:
    st, j, _ = admin.req("POST", "/api/admin/sms", {
        "scope": "SELECTED", "studentIds": [REAL_SID, BAD_SID], "message": "smoke test",
    })
    check("SMS with mixed numbers -> 200 + skippedCount=1", st == 200 and j.get("skippedCount") == 1, (st, j))
    if st == 200:
        check("SMS reports the skipped number's owner", j.get("skipped") and j["skipped"][0].get("phone") == "12345", j.get("skipped"))
        check("SMS sentCount=1 (only valid BD number)", j.get("sentCount") == 1, j.get("sentCount"))

# ================================================================ 14. notebook upload -> create -> delete -> file removed
pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
class MultipartClient(Client):
    def upload(self, path, fields, filefield, filename, filebytes, filetype):
        boundary = "----smokeboundary1234"
        parts = []
        for k, v in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{filefield}"; filename="{filename}"\r\nContent-Type: {filetype}\r\n\r\n'.encode() + filebytes + b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        body = b"".join(parts)
        r = urllib.request.Request(BASE + path, data=body, method="POST",
                                   headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
        try:
            res = self.opener.open(r)
            return res.status, json.loads(res.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode() or "{}")
mp = MultipartClient()
st, j, _ = mp.req("POST", "/api/auth/login", {"username": "admin", "password": "admin123"})
check("multipart client logged in as admin", st == 200 and j.get("ok"), (st, j))
st, j = mp.upload("/api/uploads", {"type": "notebook-pdf"}, "file", "smoke.pdf", pdf_bytes, "application/pdf")
check("notebook PDF upload -> 200", st == 200 and j.get("ok") and j.get("key"), (st, j))
nb_key = j.get("key")
if nb_key:
    st, j, _ = admin.req("POST", "/api/notebooks", {"title": "স্মোক নোটবুক", "fileKey": nb_key, "fileName": "smoke.pdf", "fileSize": len(pdf_bytes)})
    check("notebook create -> 200", st == 200 and j.get("ok") and j.get("id"), (st, j))
    nb_id = j.get("id")
    st, j, _ = admin.req("GET", "/api/files/" + nb_key)
    check("notebook file readable before delete", st == 200, st)
    if nb_id:
        st, j, _ = admin.req("DELETE", f"/api/notebooks/{nb_id}")
        check("notebook delete -> 200", st == 200 and j.get("ok"), (st, j))
        st, j, _ = admin.req("GET", "/api/files/" + nb_key)
        check("notebook R2 file removed after delete (404)", st == 404, (st, j))

# ================================================================ 15. teacher delete with FK references (notices + attendance)
fkt, st, j = login("fkt_t", "test1234")
check("fkt teacher login", fkt is not None, (st, j))
if fkt:
    st, j, _ = fkt.req("POST", "/api/notices", {"title": "FK স্মোক নোটিশ", "content": "টেস্ট কনটেন্ট"})
    check("fkt teacher creates notice", st == 200 and j.get("ok"), (st, j))
    st, j, _ = fkt.req("GET", f"/api/attendance?classId={C7}")
    students7 = j.get("students", [])
    if students7:
        st, j, _ = fkt.req("POST", "/api/attendance", {
            "classId": C7, "date": TODAY,
            "entries": [{"studentId": students7[0]["id"], "status": "PRESENT"}],
        })
        check("fkt teacher records attendance", st == 200 and j.get("ok"), (st, j))
    st, j, _ = admin.req("GET", "/api/admin/teachers")
    tlist = [t for t in j.get("teachers", []) if t.get("username") == "fkt_t"]
    check("fkt teacher listed", len(tlist) == 1, j.get("teachers", [])[:2])
    if tlist:
        FKT_ID = tlist[0]["id"]
        st, j, _ = admin.req("DELETE", f"/api/admin/teachers/{FKT_ID}")
        check("teacher delete with FK references -> 200 (was 500)", st == 200 and j.get("ok"), (st, j))
    c, st, j = login("fkt_t", "test1234")
    check("deleted teacher can no longer log in", c is None and st == 401, (st, j))

# ================================================================ 16. backup: create + inspect + restore
st, j, _ = admin.req("POST", "/api/backup", {"action": "create"})
check("backup create -> 200", st == 200 and j.get("ok") and j.get("key"), (st, j))
bk_key = j.get("key")
if bk_key:
    st, j, hdrs = admin.req("GET", "/api/files/" + bk_key)
    backup_json = j if "_raw" not in j else None
    if backup_json is None and isinstance(j.get("_raw"), bytes):
        try:
            backup_json = json.loads(j["_raw"].decode())
        except Exception:
            backup_json = None
    check("backup file downloadable as JSON", backup_json is not None and "tables" in (backup_json or {}), st)
    if backup_json:
        tables = backup_json.get("tables", {})
        check("backup includes password_resets", "password_resets" in tables, list(tables.keys()))
        check("backup includes password_change_requests", "password_change_requests" in tables, list(tables.keys()))
        exams_b = tables.get("exams", [])
        if exams_b:
            check("backup exams carry exam_type + is_published", "exam_type" in exams_b[0] and "is_published" in exams_b[0], exams_b[0].keys())
    st, j, _ = admin.req("POST", "/api/backup", {"action": "restore", "key": bk_key})
    check("backup restore -> 200 + safety snapshot key", st == 200 and j.get("ok") and str(j.get("safetyBackupKey", "")).startswith("academy/backups/pre-restore"), (st, j))
    # after restore, published exams must survive -> result cards still have subjects
    st, j, _ = admin.req("GET", f"/api/admin/result-cards?mode=MONTHLY&class=10&division=SCIENCE&month={CUR_MONTH}&year={CUR_YEAR}")
    rcards = j.get("cards", [])
    ok_restore = st == 200 and rcards and any(len(c.get("subjects", [])) > 0 for c in rcards)
    check("restore preserves is_published (cards still show subjects)", ok_restore, (st, len(rcards), rcards[0].get("subjects") if rcards else None))

# ================================================================ 17. clear-demo-data: demo only
st, j, _ = admin.req("POST", "/api/admin/clear-demo-data", {"scope": "all_demo"})
check("clear-demo-data -> 200", st == 200 and j.get("ok"), (st, j))
c, st, j = login("student01", "1234")
check("demo student01 can no longer log in", c is None and st == 401, (st, j))
c, st, j = login("rakibul", "0092")
check("demo teacher rakibul can no longer log in", c is None and st == 401, (st, j))
c, st, j = login("realsmoke1", "test1234")
check("REAL student still logs in after clear-demo", c is not None, (st, j))
st, j, _ = admin.req("GET", "/api/students?class=7")
names = [s.get("username") for s in j.get("students", [])]
check("real student survives in list, demo gone", "realsmoke1" in names and not any(str(n or "").startswith("student") and str(n or "")[7:].isdigit() for n in names), names)

# ================================================================ 18. OTP reset flow: success + session invalidation
st, j, _ = Client().req("POST", "/api/auth/reset-password", {"username": "admin", "otp": "123456", "newPassword": "admin123"})
check("admin OTP reset with correct code -> 200", st == 200 and j.get("ok"), (st, j))
st, j, _ = admin.req("GET", "/api/backup")
check("admin OLD session invalidated after reset", st == 401, (st, j))
admin, st, j = login("admin", "admin123")
check("admin re-login after reset", admin is not None, (st, j))

# ================================================================ summary
print()
print("=" * 60)
print(f"PASSED: {len(passed)}   FAILED: {len(failed)}")
if failed:
    print("FAILED CHECKS:")
    for name, detail in failed:
        print("  -", name, "|", str(detail)[:200])
sys.exit(1 if failed else 0)
