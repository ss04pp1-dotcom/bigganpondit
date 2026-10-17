-- Migration 0002: Add extended student profile columns (idempotent / alter)
ALTER TABLE students ADD COLUMN father_name TEXT;
ALTER TABLE students ADD COLUMN mother_name TEXT;
ALTER TABLE students ADD COLUMN school_name TEXT;
ALTER TABLE students ADD COLUMN phone TEXT;
ALTER TABLE students ADD COLUMN address TEXT;
ALTER TABLE students ADD COLUMN blood_group TEXT;
ALTER TABLE students ADD COLUMN dob TEXT;
