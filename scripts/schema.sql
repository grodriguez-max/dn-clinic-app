-- ===========================================================
-- DN Clinicas - Schema completo con RLS
-- Ejecutar en Supabase SQL Editor
-- ===========================================================


-- ===========================================================
-- TABLAS
-- ===========================================================

CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/Costa_Rica',
  business_hours JSONB,
  holidays JSONB,
  settings JSONB,
  plan TEXT DEFAULT 'growth' CHECK (plan IN ('starter', 'growth', 'premium')),
  onboarding_completed BOOLEAN DEFAULT false,
  whatsapp_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'professional', 'receptionist', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  bio TEXT,
  photo_url TEXT,
  schedule JSONB,
  exceptions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals ON DELETE CASCADE NOT NULL,
  custom_duration_minutes INTEGER,
  custom_price DECIMAL(10,2),
  UNIQUE(service_id, professional_id)
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  gender TEXT,
  id_number TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  source TEXT,
  allergies TEXT,
  contraindications TEXT,
  skin_type TEXT,
  medical_notes TEXT,
  opt_out_marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed', 'rescheduled')),
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_by TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL,
  chief_complaint TEXT,
  examination TEXT,
  diagnosis TEXT,
  treatment TEXT,
  recommendations TEXT,
  next_visit_notes TEXT,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  clinical_record_id UUID REFERENCES clinical_records ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('before', 'after', 'progress', 'other')),
  treatment TEXT,
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients ON DELETE SET NULL,
  patient_phone TEXT,
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'web', 'email')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
  handled_by TEXT DEFAULT 'agent',
  escalation_reason TEXT,
  summary TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'agent', 'human')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reactivation', 'birthday', 'post_treatment', 'review_request', 'treatment_reminder', 'custom_promo')),
  channel TEXT DEFAULT 'whatsapp',
  segment_query JSONB,
  message_template TEXT NOT NULL,
  is_automatic BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  schedule JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  responded BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,
  conversion_appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
  opt_out BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT DEFAULT 'factura' CHECK (invoice_type IN ('factura', 'tiquete', 'nota_credito')),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'emitida' CHECK (status IN ('borrador', 'emitida', 'aceptada', 'rechazada', 'anulada')),
  hacienda_key TEXT,
  hacienda_response JSONB,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  appointments_scheduled INTEGER DEFAULT 0,
  appointments_completed INTEGER DEFAULT 0,
  appointments_cancelled INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  returning_patients INTEGER DEFAULT 0,
  agent_conversations INTEGER DEFAULT 0,
  agent_appointments_created INTEGER DEFAULT 0,
  agent_escalations INTEGER DEFAULT 0,
  campaign_messages_sent INTEGER DEFAULT 0,
  campaign_conversions INTEGER DEFAULT 0,
  UNIQUE(clinic_id, date)
);

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);


-- ===========================================================
-- INDICES
-- ===========================================================

CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_professionals_clinic ON professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_services_clinic ON services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_clinical_records_patient ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_clinic ON conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(patient_phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_metrics_clinic_date ON metrics_daily(clinic_id, date);


-- ===========================================================
-- TRIGGERS: updated_at automatico
-- ===========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patients_updated_at ON patients;
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ===========================================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================================

CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = required_role
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- clinics
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics_select" ON clinics FOR SELECT USING (id = get_user_clinic_id());
CREATE POLICY "clinics_update" ON clinics FOR UPDATE USING (id = get_user_clinic_id());

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "users_update" ON users FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- professionals
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "professionals_select" ON professionals FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_insert" ON professionals FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_update" ON professionals FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "professionals_delete" ON professionals FOR DELETE USING (clinic_id = get_user_clinic_id());

-- services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_select" ON services FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "services_update" ON services FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "services_delete" ON services FOR DELETE USING (clinic_id = get_user_clinic_id());

-- service_professionals
ALTER TABLE service_professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_professionals_select" ON service_professionals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "service_professionals_insert" ON service_professionals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "service_professionals_update" ON service_professionals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "service_professionals_delete" ON service_professionals
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.clinic_id = get_user_clinic_id())
  );

-- patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_select" ON patients FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "patients_insert" ON patients FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "patients_update" ON patients FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "patients_delete" ON patients FOR DELETE USING (clinic_id = get_user_clinic_id());

-- appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (clinic_id = get_user_clinic_id());

-- clinical_records
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_records_select" ON clinical_records FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "clinical_records_insert" ON clinical_records FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "clinical_records_update" ON clinical_records FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- patient_photos
ALTER TABLE patient_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_photos_select" ON patient_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "patient_photos_insert" ON patient_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "patient_photos_delete" ON patient_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.clinic_id = get_user_clinic_id())
  );

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.clinic_id = get_user_clinic_id())
  );

-- campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE USING (clinic_id = get_user_clinic_id());

-- campaign_results
ALTER TABLE campaign_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_results_select" ON campaign_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.clinic_id = get_user_clinic_id())
  );
CREATE POLICY "campaign_results_insert" ON campaign_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.clinic_id = get_user_clinic_id())
  );

-- invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- metrics_daily
ALTER TABLE metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_daily_select" ON metrics_daily FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "metrics_daily_upsert" ON metrics_daily FOR ALL USING (clinic_id = get_user_clinic_id());

-- faqs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_select" ON faqs FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "faqs_insert" ON faqs FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "faqs_update" ON faqs FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "faqs_delete" ON faqs FOR DELETE USING (clinic_id = get_user_clinic_id());
