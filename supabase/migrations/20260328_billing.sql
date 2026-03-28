-- ─── BILLING TABLES ──────────────────────────────────────────────────────────
-- Fase 11: Sistema de Billing AaaS — Digital Nomads para Clínicas

-- Suscripciones por clínica
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'starter', 'growth', 'premium')),
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'paused')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  monthly_action_cap DECIMAL(10,2), -- tope mensual de acciones (null = sin tope)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Acciones facturables de los agentes
CREATE TABLE IF NOT EXISTS billable_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'appointment_created_by_agent',
    'appointment_confirmed_by_agent',
    'patient_reactivated',
    'lead_captured',
    'review_obtained',
    'campaign_message_sent'
  )),
  unit_price DECIMAL(10,4) NOT NULL,
  reference_id UUID,
  description TEXT,
  billed BOOLEAN DEFAULT false,
  billing_period_start DATE,
  billing_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Facturas de Digital Nomads al cliente
CREATE TABLE IF NOT EXISTS platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  actions_amount DECIMAL(10,2) DEFAULT 0,
  actions_detail JSONB,
  cap_applied BOOLEAN DEFAULT false,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'past_due', 'void')),
  stripe_invoice_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Precios por acción (configurable por admin)
CREATE TABLE IF NOT EXISTS action_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT UNIQUE NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Seed precios default
INSERT INTO action_pricing (action_type, unit_price, description) VALUES
  ('appointment_created_by_agent', 1.50,  'Cita agendada por la recepcionista IA'),
  ('appointment_confirmed_by_agent', 0.50, 'Cita confirmada por el agente'),
  ('patient_reactivated', 2.00,            'Paciente inactivo 60+ días que volvió por campaña'),
  ('lead_captured', 1.00,                  'Nuevo paciente registrado via agente o reserva online'),
  ('review_obtained', 1.50,                'Reseña en Google obtenida por el agente'),
  ('campaign_message_sent', 0.10,          'Mensaje de campaña de marketing enviado')
ON CONFLICT (action_type) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_billable_actions_clinic_billed ON billable_actions(clinic_id, billed);
CREATE INDEX IF NOT EXISTS idx_billable_actions_period ON billable_actions(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_clinic ON platform_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_clinic ON subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Trigger updated_at para subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billable_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_pricing ENABLE ROW LEVEL SECURITY;

-- Subscriptions: visible solo al dueño/admin de la clínica
CREATE POLICY "clinic_members_see_own_subscription"
  ON subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Billable actions: visible para owner/admin
CREATE POLICY "clinic_members_see_own_actions"
  ON billable_actions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Platform invoices: visible para owner/admin
CREATE POLICY "clinic_members_see_own_invoices"
  ON platform_invoices FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Action pricing: público para lectura
CREATE POLICY "action_pricing_public_read"
  ON action_pricing FOR SELECT
  USING (true);
