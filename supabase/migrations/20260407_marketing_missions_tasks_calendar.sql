-- Marketing Missions: objetivos activos de marketing por clínica
create table if not exists marketing_missions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  target_metric text,        -- ej: "reactivar 20 pacientes inactivos"
  current_value numeric default 0,
  target_value numeric,
  due_date date,
  phase text,                -- ej: "preparacion", "ejecucion", "escala"
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Marketing Tasks: tareas pendientes de marketing por clínica
create table if not exists marketing_tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  mission_id uuid references marketing_missions(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'awaiting_approval', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  assigned_to text default 'agent',   -- 'agent' | 'owner' | 'admin'
  due_date date,
  completed_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Content Calendar: plan de contenido semanal/mensual
create table if not exists content_calendar (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  scheduled_date date not null,
  platform text not null check (platform in ('instagram', 'facebook', 'whatsapp', 'email', 'tiktok')),
  content_type text not null check (content_type in ('post', 'story', 'reel', 'carousel', 'email', 'dm')),
  pillar text check (pillar in ('educativo', 'prueba_social', 'tips', 'oferta', 'behind_scenes')),
  topic text not null,
  angle text,                -- ángulo elegido (gatillo psicológico)
  copy_draft text,           -- borrador del copy
  image_brief text,          -- brief para la imagen
  status text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'approved', 'published', 'cancelled')),
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  engagement_data jsonb default '{}',  -- likes, comments, reach, etc.
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Outreach Log: registro de contactos de outreach (no campañas masivas sino 1-a-1)
create table if not exists outreach_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  contact_name text,
  contact_phone text,
  contact_email text,
  channel text not null check (channel in ('whatsapp', 'email', 'instagram', 'phone')),
  template_used text,
  message_sent text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'responded', 'interested', 'not_interested', 'opted_out', 'follow_up_1', 'follow_up_2', 'cold')),
  response_text text,
  response_at timestamptz,
  follow_up_due date,
  escalated_to_receptionist boolean default false,
  notes text,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS policies
alter table marketing_missions enable row level security;
alter table marketing_tasks enable row level security;
alter table content_calendar enable row level security;
alter table outreach_log enable row level security;

-- Service role has full access
create policy "service_role_missions" on marketing_missions for all using (true);
create policy "service_role_tasks" on marketing_tasks for all using (true);
create policy "service_role_calendar" on content_calendar for all using (true);
create policy "service_role_outreach" on outreach_log for all using (true);

-- Indexes
create index if not exists idx_missions_clinic_status on marketing_missions(clinic_id, status);
create index if not exists idx_tasks_clinic_status_due on marketing_tasks(clinic_id, status, due_date);
create index if not exists idx_calendar_clinic_date on content_calendar(clinic_id, scheduled_date);
create index if not exists idx_outreach_clinic_status on outreach_log(clinic_id, status);
create index if not exists idx_outreach_followup on outreach_log(clinic_id, follow_up_due) where status in ('sent', 'follow_up_1');

-- Updated_at triggers
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger missions_updated_at before update on marketing_missions for each row execute function update_updated_at();
create trigger tasks_updated_at before update on marketing_tasks for each row execute function update_updated_at();
create trigger calendar_updated_at before update on content_calendar for each row execute function update_updated_at();
