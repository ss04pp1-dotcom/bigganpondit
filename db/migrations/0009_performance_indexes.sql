-- Migration 0009: Composite performance indexes for marks and exam querying
CREATE INDEX IF NOT EXISTS idx_marks_student_exam ON marks(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_month_year ON exams(class_id, month, year);
