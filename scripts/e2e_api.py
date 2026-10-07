#!/usr/bin/env python3
"""E2E API test: auth (3 roles), IDOR, marks entry, duplicate prevention, absent rule."""
import json, urllib.request, http.cookiejar, sys

BASE = "http://localhost:3000"
passed, failed = [], []

def check(name, cond, detail=""):
    (passed if cond else failed).append((name, detail))
    print(("PASS" if cond else "FAIL"), "-", name, ("| " + str(detail)[:120] if detail and not cond else ""))

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def req(self, method, path, body=None, headers=None):
        h = {"Content-Type": "application/json", **(headers or {})}
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
        try:
            res = self.opener.open(r)
            return res.status, json.loads(res.read().decode() or "{}"), dict(res.headers)
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode() or "{}"), dict(e.headers)

teacher = Client()
# --- login: teacher ---
st, j, h = teacher.req("POST", "/api/auth/login", {"username": "rakibul", "password": "0092"})
check("teacher login", st == 200 and j.get("ok") and j.get("redirect") == "/teacher/dashboard", j)
check("session cookie set", any(c.name == "sid" for c in teacher.jar))

# --- wrong password ---
st, j, _ = Client().req("POST", "/api/auth/login", {"username": "rakibul", "password": "wrong"})
check("wrong password rejected", st == 401 and not j.get("ok"), j)

# --- role guard: teacher cannot open student pages ---
st, j, _ = teacher.req("GET", "/api/results?type=annual&studentId=1&year=2026")
check("teacher can query results API", st == 200 and j.get("ok"), j)

# --- admin login ---
admin = Client()
st, j, _ = admin.req("POST", "/api/auth/login", {"username": "admin", "password": "Admin@123"})
check("admin login", st == 200 and j.get("ok") and j.get("redirect") == "/admin/dashboard", j)

# --- student login ---
student = Client()
st, j, _ = student.req("POST", "/api/auth/login", {"username": "student01", "password": "1234"})
check("student login", st == 200 and j.get("ok") and j.get("redirect") == "/student/dashboard", j)

# --- IDOR: student asks for another student's data ---
st, j, _ = student.req("GET", "/api/students/2")
check("IDOR /api/students/2 -> 403", st == 403, (st, j))
st, j, _ = student.req("GET", "/api/results?type=search&studentId=2&year=2026")
check("IDOR /api/results?studentId=2 -> 403", st == 403, (st, j))
st, j, _ = student.req("GET", "/api/results?type=monthly&studentId=2&month=10&year=2026")
check("IDOR monthly other -> 403", st == 403, (st, j))
st, j, _ = student.req("GET", "/api/students/1")
check("student can read own record", st == 200 and j.get("ok"), (st, j))

# --- student photo access control (files) ---
st, _, headers = student.req("GET", "/api/files/academy/signatures/teacher-1-x.png")
check("student cannot read teacher signature", st in (403, 404), st)

# --- marks entry (teacher) ---
# find a 10th Science student + chemistry subject id
st, j, _ = teacher.req("GET", "/api/students?class=10&division=SCIENCE")
students_10s = j.get("students", [])
check("teacher student list (10 Science)", st == 200 and len(students_10s) == 5, len(students_10s))
sid = students_10s[0]["id"]

# get authorized subjects of teacher for class 10
st, j, _ = teacher.req("GET", "/api/results?type=merit&class=10&division=SCIENCE&month=10&year=2026")
check("merit list for 10 Science Oct 2026", st == 200 and len(j.get("merit", [])) >= 3, len(j.get("merit", [])))

# chemistry subject id via admin subjects
st, j, _ = admin.req("GET", "/api/admin/subjects")
subs = [s for s in j.get("subjects", []) if s["class_name"] == "10" and s["name"] == "রসায়ন"]
check("chemistry subject exists for class 10", len(subs) == 1, subs)
chem_id = subs[0]["id"]

# unauthorized subject: General Math (mehedi's, not rakibul's)
gm = [s for s in j.get("subjects", []) if s["class_name"] == "10" and s["name"] == "সাধারণ গণিত"][0]

payload = {
    "classId": [c for c in [10]][0] and 0 or 0,  # placeholder replaced below
}
# need real classId: fetch via internal? we can use class id number from DB: class 10 row id.
# The API expects classId (numeric id of classes row). classes ids are 1..5 for 6..10 order — but let's get from subjects: subjects row has class_id. Use admin subjects rows:
class10_id = [s for s in j.get("subjects", []) if s["class_name"] == "10"][0].get("class_id") if "class_id" in j["subjects"][0] else None

# subjects API returns class_name only; fetch numeric classId via marks API? Use /api/marks list? Simplest: teacher page uses classRow id. We'll grab it from the chemistry exam flow: try classId guess by querying db is overkill — instead use the API that returns class rows? There is none. Fallback: iterate 1..5 against a validation call.
# Determine: try marks POST with classId candidates — a wrong classId returns "বিষয়টি এই শ্রেণির নয়।" while correct one proceeds.
import time as _time
TITLE = f"ই২ই টেস্ট {int(_time.time()*1000)}"
base_body = None
found_class = None
for cid in range(1, 6):
    body = {
        "classId": cid, "division": "SCIENCE", "subjectId": chem_id, "month": 10, "year": 2026,
        "examDate": "2026-10-05", "title": TITLE, "totalMarks": 20,
        "studentId": sid, "attendance": "PRESENT", "obtainedMarks": 17,
    }
    st, j2, _ = teacher.req("POST", "/api/marks", body)
    if not (st == 400 and "শ্রেণির নয়" in str(j2.get("error", ""))):
        found_class = (cid, st, j2)
        base_body = dict(body)
        break
check("marks save (found classId, saved)", found_class and found_class[1] == 200 and found_class[2].get("saved"), found_class and (found_class[1], found_class[2]))

# duplicate prevention
dup_body = dict(base_body)
dup_body["obtainedMarks"] = 19
st, j2, _ = teacher.req("POST", "/api/marks", dup_body)
check("duplicate detected", st == 200 and j2.get("duplicate") is True, (st, j2))
dup_body["confirmUpdate"] = True
st, j2, _ = teacher.req("POST", "/api/marks", dup_body)
check("confirm update works", st == 200 and j2.get("updated") is True and j2.get("obtained") == 19, (st, j2))

# absent => 0
abs_body = dict(dup_body)
abs_body["attendance"] = "ABSENT"
abs_body["obtainedMarks"] = 19
abs_body["confirmUpdate"] = True
st, j2, _ = teacher.req("POST", "/api/marks", abs_body)
check("ABSENT forces obtained=0", st == 200 and j2.get("obtained") == 0, (st, j2))

# unauthorized subject (General Math is mehedi's)
unauth = dict(dup_body)
unauth["subjectId"] = gm["id"]
unauth["title"] = "ই২ই টেস্ট ২"
st, j2, _ = teacher.req("POST", "/api/marks", unauth)
check("teacher blocked from unauthorized subject", st == 403, (st, j2))

# obtained > total
over = dict(dup_body); over["obtainedMarks"] = 25; over["attendance"] = "PRESENT"
st, j2, _ = teacher.req("POST", "/api/marks", over)
check("obtained > total rejected", st == 400, (st, j2))

# logout
st, j, _ = teacher.req("POST", "/api/auth/logout", {})
check("logout", st == 200 and j.get("ok"), j)
st, j, _ = teacher.req("GET", "/api/students")
check("after logout API blocked", st == 401, st)

print("\n==== SUMMARY ====")
print(f"passed: {len(passed)}  failed: {len(failed)}")
for name, d in failed:
    print("  FAIL:", name, "|", d)
sys.exit(1 if failed else 0)
