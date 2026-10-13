-- 0015_student_fees_fines_notifications.sql
-- Fees, Dues, Automated Absent/Fail Fines, Payments & Notifications

CREATE TABLE IF NOT EXISTS fee_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN ('MONTHLY_FEE', 'EXAM_FEE', 'ABSENT_FINE', 'FAIL_FINE', 'NOTE_MATERIAL', 'ADMISSION_FEE', 'OTHER_FINE', 'OTHER_FEE')),
  title           TEXT NOT NULL,
  amount          REAL NOT NULL CHECK (amount >= 0),
  paid_amount     REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount      REAL NOT NULL CHECK (due_amount >= 0),
  month           INTEGER CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
  year            INTEGER,
  exam_id         INTEGER REFERENCES exams(id) ON DELETE SET NULL,
  subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  reference_note  TEXT,
  due_date        TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'WAIVED')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fee_items_student ON fee_items(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_items_status ON fee_items(status);
CREATE INDEX IF NOT EXISTS idx_fee_items_category ON fee_items(category);
CREATE INDEX IF NOT EXISTS idx_fee_items_period ON fee_items(year, month);
CREATE INDEX IF NOT EXISTS idx_fee_items_exam ON fee_items(exam_id);

CREATE TABLE IF NOT EXISTS fee_payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no      TEXT NOT NULL UNIQUE,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_item_id     INTEGER REFERENCES fee_items(id) ON DELETE SET NULL,
  amount_paid     REAL NOT NULL CHECK (amount_paid > 0),
  discount        REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
  payment_method  TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'OTHER')),
  transaction_id  TEXT,
  receipt_note    TEXT,
  collected_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  collector_name  TEXT,
  payment_date    TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON fee_payments(invoice_no);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);

CREATE TABLE IF NOT EXISTS fee_notifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  total_due       REAL NOT NULL DEFAULT 0,
  is_read         INTEGER NOT NULL DEFAULT 0,
  sent_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type            TEXT NOT NULL DEFAULT 'DUE_REMINDER' CHECK (type IN ('DUE_REMINDER', 'MONTHLY_BILL', 'FINE_ALERT', 'RECEIPT_ALERT')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fee_notifications_student ON fee_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_notifications_read ON fee_notifications(is_read);
