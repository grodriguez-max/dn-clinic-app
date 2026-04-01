-- =====================================================================
-- SCHEMA FIXES + NEW ADDITIONS
-- Safe to run whether or not 20260401_phase3 was already applied.
-- =====================================================================

-- ── Fix: products table column names to match application code ────────
-- Migration had: sell_price, current_stock, category NOT NULL CHECK (...)
-- Code uses:     sale_price, stock_quantity, category (optional, free-form)

ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price       DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity   INTEGER       DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier         TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS email            TEXT;  -- branch field added here too

-- Sync existing rows so both old and new column names have same data
UPDATE products SET sale_price = sell_price     WHERE sale_price = 0 AND sell_price IS NOT NULL;
UPDATE products SET stock_quantity = current_stock::INTEGER WHERE stock_quantity = 0 AND current_stock IS NOT NULL;

-- Drop the restrictive NOT NULL + CHECK on category so free-form values work
ALTER TABLE products ALTER COLUMN category DROP NOT NULL;

-- ── Fix: stock_movements — add previous/new quantity tracking ─────────
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS previous_quantity DECIMAL(10,2);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS new_quantity      DECIMAL(10,2);

-- ── Fix: branches — add is_main and email ────────────────────────────
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email   TEXT;

-- ── Fix: survey_responses — add score for NPS calculation ────────────
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS score INTEGER;

-- ── New: appointments — Google Calendar event ID ──────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;

-- ── New: appointments — confirmation tracking ─────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent     BOOLEAN DEFAULT false;

-- ── New: patients — referral tracking ────────────────────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES patients ON DELETE SET NULL;

-- ── New: Facturación electrónica — ATV Hacienda ───────────────────────
CREATE TABLE IF NOT EXISTS electronic_invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  invoice_id     UUID REFERENCES invoices ON DELETE SET NULL,
  clave          TEXT NOT NULL UNIQUE,             -- 50-char key from Hacienda
  consecutivo    TEXT NOT NULL,                    -- invoice number sequence
  xml_payload    TEXT,                             -- signed XML sent to ATV
  xml_response   TEXT,                             -- Hacienda response XML
  estado_hacienda TEXT DEFAULT 'pendiente'         -- pendiente | aceptado | rechazado
    CHECK (estado_hacienda IN ('pendiente', 'aceptado', 'rechazado', 'error')),
  mensaje_hacienda TEXT,
  sent_at        TIMESTAMPTZ,
  accepted_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE electronic_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "electronic_invoices_clinic" ON electronic_invoices FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS ei_clinic_idx ON electronic_invoices (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ei_clave_idx  ON electronic_invoices (clave);

-- ── New: SINPE Móvil payment requests ────────────────────────────────
CREATE TABLE IF NOT EXISTS sinpe_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  appointment_id  UUID REFERENCES appointments ON DELETE SET NULL,
  patient_id      UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  reference_code  TEXT NOT NULL,                   -- 6-char code patient includes in transfer
  status          TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  confirmed_by    UUID REFERENCES auth.users ON DELETE SET NULL,
  confirmed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sinpe_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sinpe_payments_clinic" ON sinpe_payments FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS sinpe_clinic_idx ON sinpe_payments (clinic_id, created_at DESC);

-- ── New: Social media conversations (Instagram, Messenger) ───────────
-- Extend conversations table channel support (no schema change needed,
-- channel is TEXT — just use "instagram" / "messenger" values)

-- ── New: AI generations log (fal.ai images, skin analysis) ────────────
CREATE TABLE IF NOT EXISTS ai_generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  patient_id  UUID REFERENCES patients ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('marketing_image', 'skin_analysis', 'before_after', 'video')),
  prompt      TEXT,
  result_url  TEXT,
  analysis    TEXT,
  model       TEXT,
  cost_usd    DECIMAL(8,4) DEFAULT 0,
  created_by  UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_generations_clinic" ON ai_generations FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
