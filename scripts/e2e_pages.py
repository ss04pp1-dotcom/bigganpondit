#!/usr/bin/env python3
"""Page render test: every page for all 3 roles, with key content assertions."""
import json, urllib.request, http.cookiejar, sys, re

BASE = "http://localhost:3000"
passed, failed = [], []

def check(name, cond, detail=""):
    (passed if cond else failed).append((name, detail))
    print(("PASS" if cond else "FAIL"), "-", name, ("" if cond else f"| {str(detail)[:160]}"))

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def login(self, u, p):
        r = urllib.request.Request(BASE + "/api/auth/login",
            data=json.dumps({"username": u, "password": p}).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        res = self.opener.open(r)
        return json.loads(res.read().decode())

    def get(self, path):
        try:
            res = self.opener.open(BASE + path)
            return res.status, res.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

teacher = Client(); teacher.login("rakibul", "0092")
admin = Client(); admin.login("admin", "Admin@123")
student = Client(); student.login("student01", "1234")

# helper: strip html tags
def text(html):
    return re.sub(r"<[^>]+>", " ", html)

cases = [
    (teacher, "/teacher/dashboard", 200, ["মেধা তালিকা", "মোট শিক্ষার্থী", "ড্যাশবোর্ড", "রাকিবুল ইসলাম", "দ্রুত কার্যক্রম"]),
    (teacher, "/teacher/students", 200, ["শিক্ষার্থী তালিকা", "তথ্য সংযুক্ত করুন"]),
    (teacher, "/teacher/marks", 200, ["পরীক্ষার তথ্য", "শ্রেণি", "বিভাগ", "উপস্থিতি", "সংরক্ষণ করে পরবর্তী শিক্ষার্থী"]),
    (teacher, "/teacher/results", 200, ["ফলাফল অনুসন্ধান", "সব বিষয়", "সব মাস", "খুঁজুন"]),
    (teacher, "/teacher/results?class=10&division=SCIENCE&student=1&subject=all&month=all&year=2026", 200, ["ফলাফল তালিকা", "রোল"]),
    (teacher, "/teacher/monthly-report", 200, ["মাসিক রিপোর্ট", "সব শিক্ষার্থী"]),
    (teacher, "/teacher/monthly-report?class=10&division=SCIENCE&student=1&month=10&year=2026", 200, ["মাসিক ফলাফল রিপোর্ট", "শিক্ষকের মন্তব্য", "মেধা অবস্থান", "সর্বমোট"]),
    (teacher, "/teacher/annual-report?class=10&division=SCIENCE&student=1&year=2026", 200, ["বার্ষিক ফলাফল রিপোর্ট", "মাসিক পারফরম্যান্স গ্রাফ", "N/A"]),
    (teacher, "/teacher/merit-list?class=10&division=SCIENCE&month=10&year=2026", 200, ["মেধা তালিকা", "অবস্থান", "GPA"]),
    (teacher, "/teacher/settings", 200, ["একাডেমির লোগো", "স্বাক্ষর", "শিক্ষক প্রোফাইল"]),
    (student, "/student/dashboard", 200, ["আরিফুল ইসলাম", "সাম্প্রতিক ফলাফল", "মাসিক ফলাফল"]),
    (student, "/student/profile", 200, ["আমার প্রোফাইল", "ব্যক্তিগত তথ্য", "বিষয়ভিত্তিক সারসংক্ষেপ"]),
    (student, "/student/results?subject=all&month=all&year=2026", 200, ["আমার ফলাফল", "সর্বোচ্চ"]),
    (student, "/student/monthly-result?month=10&year=2026", 200, ["মাসিক ফলাফল", "মেধা অবস্থান"]),
    (student, "/student/annual-result?year=2026", 200, ["বার্ষিক ফলাফল", "গ্রাফ"]),
    (admin, "/admin/dashboard", 200, ["প্রশাসন প্যানেল", "সাম্প্রতিক পরীক্ষা", "শিক্ষার্থী"]),
    (admin, "/admin/teachers", 200, ["শিক্ষক ব্যবস্থাপনা", "নতুন শিক্ষক"]),
    (admin, "/admin/students", 200, ["শিক্ষার্থী ব্যবস্থাপনা"]),
    (admin, "/admin/subjects", 200, ["বিষয় ব্যবস্থাপনা"]),
    (admin, "/admin/results", 200, ["ফলাফল ব্যবস্থাপনা", "পরীক্ষাসমূহ"]),
    (admin, "/admin/settings", 200, ["সিস্টেম সেটিংস", "একাডেমির নাম"]),
    (admin, "/admin/backup", 200, ["ব্যাকআপ ও রিস্টোর", "ব্যাকআপ তৈরি করুন"]),
]

for cli, path, want_st, needles in cases:
    st, html = cli.get(path)
    t = text(html)
    missing = [n for n in needles if n not in t]
    check(f"{path}", st == want_st and not missing, f"status={st} missing={missing}")

# wrong-role access checks
st, html = student.get("/teacher/dashboard")
check("student blocked from /teacher/dashboard (redirect)", st == 200 and "শিক্ষার্থী প্রোফাইল" in text(html) and "বর্তমান মাস" not in text(html), st)
st, html = teacher.get("/admin/backup")
check("teacher blocked from /admin/backup", "ড্যাশবোর্ড" in text(html) or "লগইন" in html, st)

# login page shows demo hint
import urllib.request as ur
html = ur.urlopen(BASE + "/login").read().decode()
check("login page + demo hint", "শিক্ষক লগইন" in text(html) and "rakibul / 0092" in html)

print("\n==== SUMMARY ====")
print(f"passed: {len(passed)}  failed: {len(failed)}")
for n, d in failed:
    print("  FAIL:", n, "|", d)
sys.exit(1 if failed else 0)
