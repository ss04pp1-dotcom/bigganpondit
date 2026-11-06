import { describe, expect, it } from "bun:test";
import { subjectCreateSchema, subjectUpdateSchema } from "../src/lib/validation";
import { classLabel, classNameLabel, groupLabel } from "../src/lib/constants";
import { getDb } from "../src/lib/db";

describe("New Class & Subject Creation Verification", () => {
  it("subjectCreateSchema accepts newly added classes (e.g. 11, 12, 5, HSC) without rejecting with 'শ্রেণি নির্বাচন করুন।'", () => {
    // Standard classes
    expect(
      subjectCreateSchema.safeParse({
        name: "সাধারণ গণিত",
        className: "8",
      }).success
    ).toBe(true);

    // Newly added class (Class 11)
    const res11 = subjectCreateSchema.safeParse({
      name: "উচ্চতর গণিত ১ম পত্র",
      className: "11",
      division: "SCIENCE",
    });
    expect(res11.success).toBe(true);
    if (res11.success) {
      expect(res11.data.className).toBe("11");
      expect(res11.data.name).toBe("উচ্চতর গণিত ১ম পত্র");
      expect(res11.data.division).toBe("SCIENCE");
    }

    // Newly added class (Class 5)
    const res5 = subjectCreateSchema.safeParse({
      name: "বাংলাদেশ ও বিশ্বপরিচয়",
      className: "5",
    });
    expect(res5.success).toBe(true);

    // Custom named class
    const resCustom = subjectCreateSchema.safeParse({
      name: "তথ্য ও যোগাযোগ প্রযুক্তি",
      className: "HSC-1st-Year",
    });
    expect(resCustom.success).toBe(true);

    // Rejects empty class name with exact friendly message
    const emptyClass = subjectCreateSchema.safeParse({
      name: "পদার্থবিজ্ঞান",
      className: "   ",
    });
    expect(emptyClass.success).toBe(false);
    if (!emptyClass.success) {
      expect(emptyClass.error.issues[0]?.message).toBe("শ্রেণি নির্বাচন করুন।");
    }
  });

  it("subjectUpdateSchema accepts new classes on partial updates", () => {
    const updateRes = subjectUpdateSchema.safeParse({
      className: "12",
    });
    expect(updateRes.success).toBe(true);
  });

  it("classLabel and classNameLabel correctly support new classes and Bengali digits", () => {
    expect(classLabel("11")).toBe("একাদশ শ্রেণি");
    expect(classLabel("১১")).toBe("একাদশ শ্রেণি");
    expect(classLabel("12")).toBe("দ্বাদশ শ্রেণি");
    expect(classLabel("১২")).toBe("দ্বাদশ শ্রেণি");
    expect(classLabel("5")).toBe("পঞ্চম শ্রেণি");
    expect(classLabel("৫")).toBe("পঞ্চম শ্রেণি");
    expect(classLabel("স্পেশাল ব্যাচ")).toBe("স্পেশাল ব্যাচ শ্রেণি");

    expect(groupLabel("11", "SCIENCE")).toBe("১১শ বিজ্ঞান");
    expect(groupLabel("১১", "SCIENCE")).toBe("১১শ বিজ্ঞান");
  });

  it("end-to-end DB test: creates a new class and successfully inserts a subject into it", async () => {
    const db = await getDb();

    const testClassName = `TestClass_${Date.now()}`;
    const insertClassRes = await db
      .prepare("INSERT INTO classes (name, sort_order) VALUES (?, ?)")
      .bind(testClassName, 99)
      .run();
    const classId = Number(insertClassRes?.meta?.last_row_id ?? (insertClassRes as any)?.lastInsertRowid ?? 0);
    expect(classId).toBeGreaterThan(0);

    // Validate payload with subjectCreateSchema
    const validated = subjectCreateSchema.parse({
      name: "আইসিটি ও প্রোগ্রামিং",
      className: testClassName,
      isFourthSubject: false,
    });

    // Lookup class by name exactly as POST /api/admin/subjects does
    const cls = await db
      .prepare("SELECT id, name FROM classes WHERE name = ?")
      .bind(validated.className)
      .first<{ id: number; name: string }>();

    expect(cls).not.toBeNull();
    expect(cls?.id).toBe(classId);

    // Insert subject
    const insertSubRes = await db
      .prepare("INSERT INTO subjects (name, class_id, division, is_fourth_subject) VALUES (?, ?, ?, ?)")
      .bind(validated.name, cls!.id, validated.division ?? null, validated.isFourthSubject ? 1 : 0)
      .run();
    const subjectId = Number(insertSubRes?.meta?.last_row_id ?? (insertSubRes as any)?.lastInsertRowid ?? 0);
    expect(subjectId).toBeGreaterThan(0);

    // Verify subject retrieval with joined class
    const retrieved = await db
      .prepare(
        `SELECT s.id, s.name, s.class_id, c.name as class_name
         FROM subjects s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
      )
      .bind(subjectId)
      .first<{ id: number; name: string; class_id: number; class_name: string }>();

    expect(retrieved?.name).toBe("আইসিটি ও প্রোগ্রামিং");
    expect(retrieved?.class_name).toBe(testClassName);

    // Clean up test data
    await db.prepare("DELETE FROM subjects WHERE id = ?").bind(subjectId).run();
    await db.prepare("DELETE FROM classes WHERE id = ?").bind(classId).run();
  });
});
