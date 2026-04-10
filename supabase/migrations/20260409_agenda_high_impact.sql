-- =====================================================================
-- AGENDA HIGH-IMPACT FEATURES
-- F1 drag-drop, F2 prof columns, F3 time blocks, F4 working hours,
-- F5 recurring, F6 reminders, F7 confirmation token, F8 waitlist
-- =====================================================================

-- ── appointments: new columns ─────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent         BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent          BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_token        TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_rule           TEXT CHECK (recurrence_rule IN ('weekly', 'biweekly', 'monthly'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS parent_appt_id            UUID REFERENCES appointments ON DELETE SET NULL;

-- Backfill confirmation_token for existing rows
UPDATE appointments
SET confirmation_token = gen_random_uuid()::text
WHERE confirmation_token IS NULL;

-- Unique index so tokens can be looked up safely
CREATE UNIQUE INDEX IF NOT EXISTS appointments_confirmation_token_idx
  ON appointments (confirmation_token);

-- ── time_blocks: block unavailable slots ─────────────────────────────
CREATE TABLE IF NOT EXISTS time_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals ON DELETE CASCADE,
  date            DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  reason          TEXT DEFAULT 'Bloqueado',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_blocks_clinic" ON time_blocks FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS time_blocks_clinic_date_idx ON time_blocks (clinic_id, date);
CREATE INDEX IF NOT EXISTS time_blocks_prof_date_idx   ON time_blocks (professional_id, date);

-- ── waitlist ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals ON DELETE SET NULL,
  service_id      UUID REFERENCES services ON DELETE SET NULL,
  preferred_date  DATE,
  preferred_time  TEXT DEFAULT 'any' CHECK (preferred_time IN ('morning', 'afternoon', 'any')),
  notes           TEXT,
  status          TEXT DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'booked', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_clinic" ON waitlist FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS waitlist_clinic_status_idx ON waitlist (clinic_id, status, created_at);
