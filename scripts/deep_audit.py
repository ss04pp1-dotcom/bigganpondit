#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deep functional audit v2 — idempotent. Edge cases, calculations, CRUD, security, empty states."""
import json, sys, sqlite3, time
import requests

BASE = "http://localhost:3000"
DB = "/home/z/my-project/db/academy.db"
PASS = FAIL = 0
def check(name, cond, extra=""):
    global PASS, FAIL
    if cond: PASS += 1; print(f"PASS - {name}")
    else: FAIL += 1; print(f"FAIL - {name} {extra}")

def dbq(sql, params=()):
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    rows = [dict(r) for r in con.execute(sql, params).fetchall()]
    con.commit()
    con.close()
    return rows

def login(u, p):
    r = requests.post(f"{BASE}/api/auth/login", json={"username": u, "password": p},
                      headers={"Origin": BASE})
    assert r.status_code == 200, f"login {u} failed: {r.status_code} {r.text[:200]}"
    return {"Cookie": r.headers["Set-Cookie"].split(";")[0], "Origin": BASE}

# ---------- pre-cleanup (idempotency) ----------
# NOTE: raw sqlite from this process has FK off → cascade does not run; clean children explicitly.
dbq("DELETE FROM users WHERE username LIKE 'audit%'")            # audit logins
dbq("DELETE FROM students WHERE user_id NOT IN (SELECT id FROM users)")  # orphaned students
dbq("DELETE FROM marks WHERE student_id NOT IN (SELECT id FROM students)")  # orphaned marks
dbq("DELETE FROM exams WHERE month IN (11,12) AND year=2026")    # audit exams (marks cascade)

teacher = login("rakibul", "0092")
mehedi  = login("mehedi", "2732")
admin   = login("admin", "Admin@123")
student = login("student01", "1234")

chem  = dbq("SELECT s.id FROM subjects s JOIN classes c ON c.id=s.class_id WHERE s.name='রসায়ন' AND c.name='10'")[0]["id"]
cls10 = dbq("SELECT id FROM classes WHERE name='10'")[0]["id"]

def save_mark(sess, student_id, obtained, total=100, month=11, title="টেস্ট", date="2026-11-05", confirm=True):
    return requests.post(f"{BASE}/api/marks", headers=sess, json={
        "classId": cls10, "division": "SCIENCE", "subjectId": chem, "month": month, "year": 2026,
        "examDate": date, "title": title, "totalMarks": total, "studentId": student_id,
        "attendance": "PRESENT", "obtainedMarks": obtained, "confirmUpdate": confirm})

def monthly(sess, student_id, month):
    return requests.get(f"{BASE}/api/results", headers=sess,
                        params={"type": "monthly", "studentId": student_id, "month": month, "year": 2026}).json().get("report", {})

def search_rows(sess, student_id, month=11):
    return requests.get(f"{BASE}/api/results", headers=sess,
                        params={"type": "search", "studentId": student_id, "month": month, "year": 2026}).json().get("rows", [])

# ---------- 1. create audit students ----------
print("\n--- Setup: audit students ---")
r = requests.post(f"{BASE}/api/students", headers=admin,
                  json={"name": "অডিট শিক্ষার্থী ১", "className": "10", "division": "SCIENCE", "section": "ক", "roll": 901, "username": "auditstu1", "password": "1234"})
check("create audit student 1", r.status_code == 201, r.text[:150])
r = requests.post(f"{BASE}/api/students", headers=admin,
                  json={"name": "অডিট শিক্ষার্থী ২", "className": "10", "division": "SCIENCE", "section": "ক", "roll": 902, "username": "auditstu2", "password": "1234"})
check("create audit student 2", r.status_code == 201, r.text[:150])
st1 = dbq("SELECT st.id FROM students st JOIN users u ON u.id=st.user_id WHERE u.username='auditstu1'")[0]["id"]
st2 = dbq("SELECT st.id FROM students st JOIN users u ON u.id=st.user_id WHERE u.username='auditstu2'")[0]["id"]

# ---------- 2. Grade boundaries (November, st1) ----------
print("\n--- Grade boundaries ---")
BOUNDARIES = [(0,"F",0.0),(32,"F",0.0),(33,"D",1.0),(39,"D",1.0),(40,"C",2.0),(49,"C",2.0),
              (50,"B",3.0),(59,"B",3.0),(60,"A-",3.5),(69,"A-",3.5),(70,"A",4.0),(79,"A",4.0),
              (80,"A+",5.0),(99,"A+",5.0),(100,"A+",5.0)]
for i,(m,g,gpa) in enumerate(BOUNDARIES):
    rr = save_mark(teacher, st1, m, title=f"বাউন্ডারি {i}", date=f"2026-11-{i+1:02d}")
    row = next((x for x in search_rows(teacher, st1) if x["title"] == f"বাউন্ডারি {i}"), None)
    okk = rr.status_code == 200 and rr.json().get("saved")
    check(f"boundary {m}/100 -> {g} ({gpa})", okk and row and row["grade"] == g and abs(row["gpa"] - gpa) < 0.01,
          f"save={rr.status_code} got {row and (row['grade'], row['gpa'])}")

r = save_mark(teacher, st1, -5, title="নেগেটিভ")
check("negative marks rejected", r.status_code == 400, r.text[:120])
r = save_mark(teacher, st1, 101, title="ওভারফ্লো")
check("obtained > total rejected", r.status_code == 400, r.text[:120])
r = save_mark(teacher, st1, 19.5, total=20, title="দশমিক টেস্ট")
check("decimal marks accepted (19.5/20)", r.status_code == 200, r.text[:120])
row = next((x for x in search_rows(teacher, st1) if x["title"] == "দশমিক টেস্ট"), None)
check("decimal stored precisely (19.5, 97.5%)", row and row["obtained"] == 19.5 and abs(row["percentage"] - 97.5) < 0.01,
      f"got {row and (row['obtained'], row['percentage'])}")

# ---------- 3. SUM/SUM aggregation (December, both students) ----------
print("\n--- SUM/SUM aggregation (not average of %) ---")
for sid in (st1, st2):
    save_mark(teacher, sid, 10, total=20, month=12, title="এগ্রিগেট এ", date="2026-12-01")
    save_mark(teacher, sid, 25, total=30, month=12, title="এগ্রিগেট বি", date="2026-12-02")
rep2 = monthly(teacher, st2, 12)
chem_row = next((s for s in rep2.get("subjects", []) if s["subjectName"] == "রসায়ন"), None)
check("SUM/SUM = 35/50 = 70% -> A (not 66.67% A-)", chem_row and abs(chem_row["percentage"] - 70.0) < 0.01 and chem_row["grade"] == "A",
      f"got {chem_row and (chem_row['percentage'], chem_row['grade'])}")
check("SUM totals correct (obtained 35 of 50)", chem_row and chem_row["totalMarks"] == 50 and chem_row["obtained"] == 35,
      f"got {chem_row and (chem_row['totalMarks'], chem_row['obtained'])}")

# ---------- 4. Ranking tie-break ----------
print("\n--- Ranking tie-break (identical stats -> roll order) ---")
r1 = monthly(teacher, st1, 12); r2 = monthly(teacher, st2, 12)
check("cohort = 2 (only students with marks)", r1.get("cohortSize") == 2, f"got {r1.get('cohortSize')}")
check("st1 (roll 901) position 1", r1.get("position") == 1, f"got {r1.get('position')}")
check("st2 (roll 902) position 2", r2.get("position") == 2, f"got {r2.get('position')}")

# ---------- 5. Division isolation ----------
print("\n--- Division isolation (merit, Oct seed data) ---")
sci = requests.get(f"{BASE}/api/results", headers=teacher, params={"type": "merit", "class": "10", "division": "SCIENCE", "month": 10, "year": 2026}).json()["merit"]
hum = requests.get(f"{BASE}/api/results", headers=teacher, params={"type": "merit", "class": "10", "division": "HUMANITIES", "month": 10, "year": 2026}).json()["merit"]
check("class 10 SCIENCE merit = 5", len(sci) == 5, f"got {len(sci)}")
check("class 10 HUMANITIES merit = 3", len(hum) == 3, f"got {len(hum)}")
pcts = [e["percentage"] for e in sci]
check("merit pct descending", pcts == sorted(pcts, reverse=True), str(pcts))
check("merit positions 1..5", [e["position"] for e in sci] == [1,2,3,4,5])

# ---------- 6. Fourth subject flag ----------
print("\n--- Fourth subject ---")
check("উচ্চতর গণিত flagged 4th in DB", dbq("SELECT is_fourth_subject f FROM subjects WHERE name='উচ্চতর গণিত' AND class_id=5")[0]["f"] == 1)
subs = {s["subjectName"]: s for s in monthly(admin, 1, 10).get("subjects", [])}
check("student01 Oct monthly (admin, all subjects): উচ্চতর গণিত isFourth=true", subs.get("উচ্চতর গণিত", {}).get("isFourth") is True, str(list(subs.keys())))
check("student01 Oct monthly: কৃষিশিক্ষা isFourth=true", subs.get("কৃষিশিক্ষা", {}).get("isFourth") is True)
check("student01 Oct monthly: রসায়ন isFourth=false", subs.get("রসায়ন", {}).get("isFourth") is False)
subs_r = {s["subjectName"]: s for s in monthly(teacher, 1, 10).get("subjects", [])}
check("teacher monthly shows only own subjects (রসায়ন yes, উচ্চতর গণিত no)", "রসায়ন" in subs_r and "উচ্চতর গণিত" not in subs_r, str(list(subs_r.keys())))

# ---------- 7. Absent handling ----------
print("\n--- Absent handling ---")
save_mark(teacher, st2, 15, total=100, month=11, title="হাজিরা টেস্ট", date="2026-11-25", confirm=False)
exam_list = requests.get(f"{BASE}/api/marks", headers=teacher, params={"class": "10", "division": "SCIENCE", "subjectId": chem, "month": 11, "year": 2026}).json()["exams"]
att_exam = next((e for e in exam_list if e["title"] == "হাজিরা টেস্ট"), None)
marks = requests.get(f"{BASE}/api/marks", headers=teacher, params={"examId": att_exam["id"]}).json()["marks"]
mk = next(m for m in marks if m["student_id"] == st2)
r = requests.patch(f"{BASE}/api/marks/{mk['id']}", headers=teacher, json={"attendance": "ABSENT", "obtainedMarks": 99})
after = dbq("SELECT obtained_marks o, attendance a FROM marks WHERE id=?", (mk["id"],))[0]
check("PATCH absent forces obtained=0 (sent 99)", r.status_code == 200 and after["o"] == 0 and after["a"] == "ABSENT", str(after))
r = requests.patch(f"{BASE}/api/marks/{mk['id']}", headers=teacher, json={"attendance": "PRESENT", "obtainedMarks": 88})
after = dbq("SELECT obtained_marks o FROM marks WHERE id=?", (mk["id"],))[0]
check("PATCH present keeps obtained (88)", r.status_code == 200 and after["o"] == 88, str(after))

# ---------- 8. Marks correction permissions ----------
print("\n--- Marks correction permissions ---")
r = requests.patch(f"{BASE}/api/marks/{mk['id']}", headers=mehedi, json={"attendance": "PRESENT", "obtainedMarks": 50})
check("unauthorized teacher PATCH -> 403 (মেহেদী vs রসায়ন)", r.status_code == 403, f"got {r.status_code}")
r = requests.patch(f"{BASE}/api/marks/{mk['id']}", headers=student, json={"attendance": "PRESENT", "obtainedMarks": 50})
check("student PATCH mark -> 403", r.status_code == 403, f"got {r.status_code}")
r = requests.patch(f"{BASE}/api/marks/{mk['id']}", headers=teacher, json={"attendance": "PRESENT", "obtainedMarks": 500})
check("PATCH obtained > total rejected", r.status_code == 400, f"got {r.status_code}")
r = requests.delete(f"{BASE}/api/marks/{mk['id']}", headers=teacher)
check("teacher DELETE mark -> 403 (admin only)", r.status_code == 403, f"got {r.status_code}")

# ---------- 9. Student CRUD validation ----------
print("\n--- Student CRUD validation ---")
r = requests.post(f"{BASE}/api/students", headers=admin, json={"name": "ডুপ", "className": "10", "division": "SCIENCE", "roll": 903, "username": "auditstu1", "password": "1234"})
check("duplicate username rejected", r.status_code == 400 and "ইউজারনেম" in r.json().get("error", ""), r.text[:150])
r = requests.post(f"{BASE}/api/students", headers=admin, json={"name": "ডুপ রোল", "className": "10", "division": "SCIENCE", "roll": 1, "username": "auditstu3", "password": "1234"})
check("duplicate roll (class+division) rejected", r.status_code == 400 and "রোল" in r.json().get("error", ""), r.text[:150])
r = requests.post(f"{BASE}/api/students", headers=admin, json={"name": "নো ডিভ", "className": "10", "roll": 904, "username": "auditstu4", "password": "1234"})
check("class 9/10 without division rejected", r.status_code == 400, r.text[:150])
r = requests.post(f"{BASE}/api/students", headers=admin, json={"name": "ডিভ ইন ৬", "className": "6", "division": "SCIENCE", "roll": 90, "username": "auditstu5", "password": "1234"})
check("class 6 with division rejected", r.status_code == 400, r.text[:150])
r = requests.patch(f"{BASE}/api/students/{st1}", headers=admin, json={"name": "অডিট শিক্ষার্থী ১ (সম্পাদিত)"})
check("student PATCH name", r.status_code == 200, r.text[:150])
nm = dbq("SELECT name FROM students WHERE id=?", (st1,))[0]["name"]
check("PATCH name persisted + users table synced", nm == "অডিট শিক্ষার্থী ১ (সম্পাদিত)" and dbq("SELECT name FROM users WHERE id=(SELECT user_id FROM students WHERE id=?)",(st1,))[0]["name"] == nm)
r = requests.get(f"{BASE}/api/students/{st1}", headers=teacher)
check("teacher GET student of own class -> 200", r.status_code == 200, f"got {r.status_code}")

# teacher with only class-6 subject
r = requests.post(f"{BASE}/api/admin/teachers", headers=admin, json={"name": "টেস্ট শিক্ষক", "username": "auditteach", "password": "1234", "shortName": "AT", "subjectIds": []})
check("create audit teacher", r.status_code == 201, r.text[:150])
at = dbq("SELECT t.id FROM teachers t JOIN users u ON u.id=t.user_id WHERE u.username='auditteach'")[0]["id"]
cls6_math = dbq("SELECT s.id FROM subjects s JOIN classes c ON c.id=s.class_id WHERE s.name='গণিত' AND c.name='6'")
if cls6_math:
    requests.patch(f"{BASE}/api/admin/teachers/{at}", headers=admin, json={"subjectIds": [cls6_math[0]["id"]]})
auditt = login("auditteach", "1234")
r = requests.post(f"{BASE}/api/students", headers=auditt, json={"name": "অনুমতি নেই", "className": "10", "division": "SCIENCE", "roll": 910, "username": "auditstu6", "password": "1234"})
check("class-6 teacher creating class-10 student -> 403", r.status_code == 403, f"got {r.status_code}")
r = requests.get(f"{BASE}/api/students?class=10", headers=auditt)
n = len(r.json().get("students", []))
check("class-6 teacher cannot list class-10 students", r.status_code == 403 or n == 0, f"LEAK: {n} students visible")

# ---------- 10. Teacher/Subject admin CRUD ----------
print("\n--- Teacher/Subject admin CRUD ---")
r = requests.post(f"{BASE}/api/admin/subjects", headers=admin, json={"name": "অডিট বিষয়", "className": "6"})
check("create subject", r.status_code == 201, r.text[:150])
asub = dbq("SELECT id FROM subjects WHERE name='অডিট বিষয়'")[0]["id"]
r = requests.patch(f"{BASE}/api/admin/subjects/{asub}", headers=admin, json={"name": "অডিট বিষয় ২"})
check("update subject", r.status_code == 200, r.text[:150])
r = requests.delete(f"{BASE}/api/admin/subjects/{asub}", headers=admin)
check("delete subject", r.status_code == 200, r.text[:150])
r = requests.post(f"{BASE}/api/admin/teachers", headers=admin, json={"name": "x", "username": "mehedi", "password": "1234", "shortName": "X"})
check("duplicate teacher username rejected", r.status_code == 400, r.text[:150])
r = requests.patch(f"{BASE}/api/admin/teachers/{at}", headers=teacher)
check("teacher cannot update teachers -> 403", r.status_code == 403, f"got {r.status_code}")
r = requests.delete(f"{BASE}/api/admin/teachers/{at}", headers=admin)
check("delete audit teacher", r.status_code == 200, r.text[:150])

# ---------- 11. CSRF / session security ----------
print("\n--- CSRF & session security ---")
r = requests.post(f"{BASE}/api/marks", headers={"Cookie": teacher["Cookie"], "Origin": "http://evil.example"},
                  json={"classId": cls10, "division": "SCIENCE", "subjectId": chem, "month": 11, "year": 2026,
                        "examDate": "2026-11-28", "title": "সিএসআরএফ", "totalMarks": 10, "studentId": st1,
                        "attendance": "PRESENT", "obtainedMarks": 5})
check("cross-origin POST rejected (CSRF)", r.status_code == 403, f"got {r.status_code}")
import hashlib
sid = teacher["Cookie"].split("=")[1]
dbq("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(sid.encode()).hexdigest(),))
r = requests.get(f"{BASE}/api/results", headers=teacher, params={"type": "search", "studentId": st1})
check("deleted session -> 401", r.status_code == 401, f"got {r.status_code}")
teacher = login("rakibul", "0092")
limited = False
for i in range(12):
    r = requests.post(f"{BASE}/api/auth/login", json={"username": "ratelimit_probe", "password": "wrong"}, headers={"Origin": BASE})
    if r.status_code == 429: limited = True; break
check("login rate limit (429 after repeated failures)", limited, f"last {r.status_code}")

# ---------- 12. Backup round trip ----------
print("\n--- Backup create/verify/restore/delete ---")
r = requests.post(f"{BASE}/api/backup", headers=admin, json={"action": "create"})
check("backup create", r.status_code == 200, r.text[:200])
key = r.json()["key"]
counts_before = {t: dbq(f"SELECT COUNT(*) c FROM {t}")[0]["c"] for t in ["users","students","exams","marks","subjects"]}
r = requests.get(f"{BASE}/api/files/{key}", headers=admin)
check("backup downloadable", r.status_code == 200 and len(r.content) > 100, f"{r.status_code} len={len(r.content)}")
backup = json.loads(r.content)
check("backup JSON has all tables", all(t in backup.get("tables", {}) for t in ["users","students","exams","marks","subjects","classes","teachers","teacher_subjects","settings"]), str(list(backup.get("tables", {}).keys())))
dbq("DELETE FROM marks WHERE student_id IN (?,?)", (st1, st2))
check("audit marks deleted pre-restore", dbq("SELECT COUNT(*) c FROM marks WHERE student_id IN (?,?)", (st1, st2))[0]["c"] == 0)
r = requests.post(f"{BASE}/api/backup", headers=admin, json={"action": "restore", "key": key})
check("backup restore", r.status_code == 200, r.text[:200])
counts_after = {t: dbq(f"SELECT COUNT(*) c FROM {t}")[0]["c"] for t in ["users","students","exams","marks","subjects"]}
check("restore restores counts", counts_before == counts_after, f"{counts_before} vs {counts_after}")
r = requests.get(f"{BASE}/api/results", headers=admin, params={"type": "search", "studentId": 1, "month": 10, "year": 2026})
check("acting admin session survives restore", r.status_code == 200, f"got {r.status_code}")
r = requests.post(f"{BASE}/api/backup", headers=teacher, json={"action": "create"})
check("other sessions killed by restore (401) or blocked", r.status_code in (401, 403), f"got {r.status_code}")
teacher = login("rakibul", "0092")  # re-login after restore
r = requests.post(f"{BASE}/api/backup", headers=teacher, json={"action": "create"})
check("teacher (re-logged) cannot backup -> 403", r.status_code == 403, f"got {r.status_code}")
r = requests.post(f"{BASE}/api/backup", headers=admin, json={"action": "delete", "key": key})
check("backup delete", r.status_code == 200, r.text[:150])

# ---------- 13. Empty states ----------
print("\n--- Empty states ---")
rep = monthly(teacher, st1, 1)
check("empty month -> 0 subjects, position null, no crash", not rep.get("subjects") and rep["overall"]["totalMarks"] == 0 and rep.get("position") is None, str(rep.get("cohortSize")))
annual = requests.get(f"{BASE}/api/results", headers=teacher, params={"type": "annual", "studentId": st1, "year": 2025}).json()["annual"]
check("annual no-data year -> all months null, overall null", all(m["percentage"] is None for m in annual["months"]) and annual["overall"]["percentage"] is None)
merit = requests.get(f"{BASE}/api/results", headers=teacher, params={"type": "merit", "class": "7", "month": 5, "year": 2026}).json().get("merit")
check("merit empty month -> []", merit == [], str(merit and len(merit)))
rows_jan = requests.get(f"{BASE}/api/results", headers=teacher, params={"type":"search","studentId":st1,"month":1,"year":2026}).json().get("rows")
check("search empty month -> []", rows_jan == [], str(rows_jan and len(rows_jan)))

# ---------- 14. Student portal scope ----------
print("\n--- Student portal scope ---")
student = login("student01", "1234")  # re-login: restore invalidated old sessions
r = requests.get(f"{BASE}/api/results", headers=student, params={"type": "search", "studentId": st2})
check("student cannot view other's search", r.status_code == 403, f"got {r.status_code}")
r = requests.get(f"{BASE}/api/results", headers=student, params={"type": "merit", "class": "10", "division": "SCIENCE"})
check("student cannot call merit", r.status_code == 403, f"got {r.status_code}")
r = requests.get(f"{BASE}/api/results", headers=student, params={"type": "monthly"})
check("student monthly defaults to self", r.status_code == 200 and r.json()["report"]["student"]["studentId"] == 1, r.text[:150])
r = requests.get(f"{BASE}/api/students", headers=student)
check("student list API returns only own record", all(s["id"] == 1 for s in r.json().get("students", [])))

# ---------- 15. Highest mark ----------
print("\n--- Highest mark ---")
row = next((x for x in search_rows(teacher, st1) if x["title"] == "বাউন্ডারি 14"), None)
check("highest = 100 on boundary-100 exam", row and row["highest"] == 100, f"got {row and row['highest']}")

# ---------- 16. Cleanup ----------
print("\n--- Cleanup ---")
requests.delete(f"{BASE}/api/students/{st1}", headers=admin)
requests.delete(f"{BASE}/api/students/{st2}", headers=admin)
check("audit users removed", dbq("SELECT COUNT(*) c FROM users WHERE username LIKE 'audit%'")[0]["c"] == 0)
dbq("DELETE FROM exams WHERE month IN (11,12) AND year=2026")
check("audit exams removed", dbq("SELECT COUNT(*) c FROM exams WHERE month IN (11,12) AND year=2026")[0]["c"] == 0)

print(f"\n==== DEEP AUDIT SUMMARY ====")
print(f"passed: {PASS}  failed: {FAIL}")
sys.exit(1 if FAIL else 0)
