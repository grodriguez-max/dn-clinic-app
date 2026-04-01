-- =====================================================================
-- FASE 2: Paquetes, Abonos, Comisiones, Sistema de Caja
-- =====================================================================

-- ── Feature 1: Paquetes y Sesiones ───────────────────────────────────

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  service_id UUID REFERENCES services ON DELETE CASCADE NOT NULL,
  total_sessions INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  validity_days INTEGER DEFAULT 365,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_clinic_isolation"
  ON packages FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS patient_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES packages ON DELETE CASCADE NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  sessions_total INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending')),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  notes TEXT
);

ALTER TABLE patient_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_packages_clinic_isolation"
  ON patient_packages FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS patient_packages_patient_idx ON patient_packages (patient_id, status);
CREATE INDEX IF NOT EXISTS patient_packages_clinic_idx ON patient_packages (clinic_id, status);

-- ── Feature 2: Abonos / Pagos Parciales ──────────────────────────────

CREATE TABLE IF NOT EXISTS appointment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'full', 'remaining', 'refund')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'sinpe', 'transfer', 'online')),
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_payments_clinic_isolation"
  ON appointment_payments FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS appt_payments_appt_idx ON appointment_payments (appointment_id);
CREATE INDEX IF NOT EXISTS appt_payments_clinic_idx ON appointment_payments (clinic_id, created_at DESC);

-- ── Feature 3: Comisiones por Profesional ────────────────────────────

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS default_commission_percentage DECIMAL(5,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services ON DELETE CASCADE,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value DECIMAL(10,2) NOT NULL,
  UNIQUE(professional_id, service_id)
);

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_rules_clinic_isolation"
  ON commission_rules FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals NOT NULL,
  appointment_id UUID REFERENCES appointments NOT NULL,
  service_id UUID REFERENCES services NOT NULL,
  service_price DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_clinic_isolation"
  ON commissions FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS commissions_professional_idx ON commissions (professional_id, status);
CREATE INDEX IF NOT EXISTS commissions_clinic_idx ON commissions (clinic_id, created_at DESC);

-- ── Feature 4: Sistema de Caja con Cierre Diario ─────────────────────

CREATE TABLE IF NOT EXISTS cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10,2),
  expected_balance DECIMAL(10,2),
  difference DECIMAL(10,2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by UUID REFERENCES auth.users,
  notes TEXT
);

ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_register_clinic_isolation"
  ON cash_register FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  register_id UUID REFERENCES cash_register ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'adjustment')),
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'sinpe', 'transfer', 'online')),
  description TEXT,
  appointment_id UUID REFERENCES appointments,
  invoice_id UUID REFERENCES invoices,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_movements_clinic_isolation"
  ON cash_movements FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS cash_movements_register_idx ON cash_movements (register_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cash_movements_clinic_idx ON cash_movements (clinic_id, created_at DESC);

-- ── Seed: Demo data for Estética Bella Vista ─────────────────────────
-- NOTE: Run this block manually or via a seed script pointing to the demo clinic.
-- The clinic/service/professional IDs must be replaced with real UUIDs from your DB.
-- Leaving as commented examples to avoid FK violations on fresh installs.

/*
-- Example: Insert 2 packages once you know the real clinic_id and service IDs
-- INSERT INTO packages (clinic_id, name, description, service_id, total_sessions, price, discount_percentage, validity_days)
-- VALUES
--   ('<clinic_id>', 'Pack 10 Sesiones Depilación Láser', 'Paquete de 10 sesiones de depilación láser con 20% de descuento',
--    '<laser_service_id>', 10, 80000, 20, 365),
--   ('<clinic_id>', 'Pack 5 Limpiezas Faciales', '5 limpiezas faciales con hidratación incluida',
--    '<facial_service_id>', 5, 45000, 15, 180);
*/
