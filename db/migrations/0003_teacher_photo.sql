-- Migration 0003: Add photo_key column to teachers table
ALTER TABLE teachers ADD COLUMN photo_key TEXT;
