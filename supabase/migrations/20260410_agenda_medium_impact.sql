-- =====================================================================
-- AGENDA MEDIUM-IMPACT FEATURES
-- SOAP notes, buffer time, check-in
-- =====================================================================

-- ── appointments: check-in timestamp ─────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- ── services: buffer time after appointment ───────────────────────────
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 0;

-- ── clinical_notes: SOAP per appointment ─────────────────────────────
CREATE TABLE IF NOT EXISTS clinical_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments ON DELETE CASCADE,
  clinic_id      UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  subjective     TEXT,   -- S: Lo que dice el paciente
  objective      TEXT,   -- O: Lo que observa el profesional
  assessment     TEXT,   -- A: Diagnóstico / evaluación
  plan           TEXT,   -- P: Plan de tratamiento
  created_by     UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_notes_clinic" ON clinical_notes FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS clinical_notes_appt_idx ON clinical_notes (appointment_id);
