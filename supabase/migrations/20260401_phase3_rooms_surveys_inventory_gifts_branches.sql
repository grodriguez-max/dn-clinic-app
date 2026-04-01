-- =====================================================================
-- FASE 2 (cont.) + FASE 3: Rooms, Surveys, Inventory, GiftCards, Branches
-- =====================================================================

-- ── Feature 5: Cabinas y Salas ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  equipment TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_clinic_isolation" ON rooms FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS service_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES rooms ON DELETE CASCADE NOT NULL,
  UNIQUE(service_id, room_id)
);

ALTER TABLE service_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_rooms_isolation" ON service_rooms FOR ALL
  USING (room_id IN (SELECT id FROM rooms WHERE clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())));

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms ON DELETE SET NULL;

-- ── Feature 6: Encuestas de Satisfacción ─────────────────────────────

CREATE TABLE IF NOT EXISTS survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  send_days_after INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "survey_templates_isolation" ON survey_templates FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  survey_template_id UUID REFERENCES survey_templates ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals ON DELETE SET NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "survey_responses_isolation" ON survey_responses FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS survey_responses_clinic_idx ON survey_responses (clinic_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS survey_responses_patient_idx ON survey_responses (patient_id);

-- ── Feature 7: Control de Inventario ─────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT NOT NULL CHECK (category IN ('consumable', 'retail')),
  description TEXT,
  cost_price DECIMAL(10,2) DEFAULT 0,
  sell_price DECIMAL(10,2) DEFAULT 0,
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock_alert DECIMAL(10,2) DEFAULT 5,
  unit TEXT DEFAULT 'unidad',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_clinic_isolation" ON products FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity DECIMAL(10,2) NOT NULL,
  reason TEXT CHECK (reason IN ('sale', 'use_in_service', 'purchase', 'adjustment', 'expired')),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_isolation" ON stock_movements FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements (product_id, created_at DESC);

-- Service-product link (optional: service uses X units of product)
CREATE TABLE IF NOT EXISTS service_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE CASCADE NOT NULL,
  quantity_per_service DECIMAL(10,2) DEFAULT 1,
  UNIQUE(service_id, product_id)
);

ALTER TABLE service_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_products_isolation" ON service_products FOR ALL
  USING (service_id IN (SELECT id FROM services WHERE clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())));

-- ── Feature 8: Gift Cards y Referidos ────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance DECIMAL(10,2) NOT NULL,
  purchased_by UUID REFERENCES patients ON DELETE SET NULL,
  redeemed_by UUID REFERENCES patients ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, code)
);

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift_cards_clinic_isolation" ON gift_cards FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  referrer_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES patients ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('discount_percentage', 'fixed_amount', 'free_service')),
  reward_value DECIMAL(10,2),
  reward_service_id UUID REFERENCES services ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_clinic_isolation" ON referrals FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals (clinic_id, referral_code);

-- ── Feature 9: Multi-Sucursal ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  business_hours JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_clinic_isolation" ON branches FOR ALL
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches ON DELETE SET NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches ON DELETE SET NULL;
ALTER TABLE cash_register ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches ON DELETE SET NULL;
