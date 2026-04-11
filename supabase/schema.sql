-- VetFlowPMS Database Schema
-- Run this in your Supabase SQL editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PRACTICES
-- ============================================
create table practices (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  entity_name text,
  abn text,
  logo_url text,
  brand_colours jsonb,
  timezone text not null default 'Australia/Brisbane',
  currency text not null default 'AUD' check (currency in ('AUD', 'NZD')),
  tax_rate numeric(5,2) not null default 10.00,
  address text,
  phone text,
  email text,
  booking_url text,
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction table: user <-> practice with role
create table user_practices (
  user_id uuid not null references users(id) on delete cascade,
  practice_id uuid not null references practices(id) on delete cascade,
  role text not null check (role in ('owner', 'clinic_owner', 'vet', 'admin', 'client', 'locum')),
  access_expires_at timestamptz,  -- locum only: when their access to THIS practice expires
  primary key (user_id, practice_id)
);

-- ============================================
-- CLIENTS (pet owners)
-- ============================================
create table clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  address text,
  communication_preferences jsonb default '{}',
  user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction: client <-> practice
create table client_practices (
  client_id uuid not null references clients(id) on delete cascade,
  practice_id uuid not null references practices(id) on delete cascade,
  primary key (client_id, practice_id)
);

-- ============================================
-- PATIENTS
-- ============================================
create table patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  species text not null check (species in ('dog', 'cat', 'horse', 'other')),
  breed text,
  sex text,
  dob date,
  microchip text,
  photo_url text,
  status text not null default 'active' check (status in ('active', 'deceased', 'transferred')),
  allergies text[] default '{}',
  conditions text[] default '{}',
  owner_id uuid not null references clients(id),
  practice_id uuid not null references practices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BCS (Body Condition Score) history
create table patient_bcs (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  bcs_score integer not null check (bcs_score between 1 and 9),
  assessed_by uuid references users(id),
  notes text,
  assessed_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================
-- APPOINTMENTS (with embedded clinical notes)
-- ============================================
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  appointment_type_id text not null,
  patient_id uuid not null references patients(id),
  client_id uuid not null references clients(id),
  vet_id uuid not null references users(id),
  practice_id uuid not null references practices(id),
  location_type text not null default 'clinic' check (location_type in ('clinic', 'house_call')),
  location_address text,
  travel_time_minutes integer default 0,
  notes text,
  booked_by text not null default 'vet' check (booked_by in ('client', 'admin', 'vet')),

  -- Clinical note fields (merged from consults)
  consult_date date,                    -- User-chosen date (can differ from appointment date for backdating)
  presenting_complaint text,
  history text,
  examination text,
  diagnosis text,
  treatment_plan text,
  notes_transcript text,                -- VetScribe raw transcript
  notes_ai_generated text,              -- VetScribe AI output
  template_used text,
  clinical_status text not null default 'none'
    check (clinical_status in ('none', 'draft', 'finalised')),  -- 'none' means no notes yet
  finalised_at timestamptz,
  finalised_by uuid references users(id),
  updated_by uuid references users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Appointment addendums (for finalised clinical notes)
create table appointment_addendums (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  content text not null,
  added_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- ============================================
-- PRESCRIPTIONS
-- ============================================
create table prescriptions (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id),
  patient_id uuid not null references patients(id),
  medication text not null,
  dose text,
  frequency text,
  duration text,
  quantity text,
  instructions text,
  dispensed boolean not null default false,
  dispensed_date date,
  -- Regulatory fields (QLD Vet Board)
  schedule text CHECK (schedule IN ('S2', 'S3', 'S4', 'S8', 'unscheduled')),
  batch_number text,
  supplier_ref text,
  withdrawal_period_days int,  -- equine / food animal use
  is_controlled boolean GENERATED ALWAYS AS (schedule IN ('S4', 'S8')) STORED,
  created_at timestamptz not null default now()
);

-- ============================================
-- PRODUCTS / SERVICES
-- ============================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  type text not null check (type in ('service', 'product', 'package')),
  category text,
  practice_id uuid not null references practices(id),
  price numeric(10,2) not null default 0,
  tax_rate numeric(5,2) not null default 10.00,
  stock_qty integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- INVOICES
-- ============================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null,
  date date not null default current_date,
  due_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void')),
  client_id uuid not null references clients(id),
  practice_id uuid not null references practices(id),
  appointment_id uuid references appointments(id),
  performing_vet_id uuid references users(id),
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  pdf_url text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(invoice_number, practice_id)
);

create table invoice_line_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_id uuid references products(id),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null,
  tax_rate numeric(5,2) not null default 10.00,
  total numeric(10,2) not null,
  sort_order integer not null default 0
);

-- ============================================
-- CARE PACKAGES (Phase 2)
-- ============================================
create table care_packages (
  id uuid primary key default uuid_generate_v4(),
  practice_id uuid not null references practices(id),
  name text not null,
  included_sessions jsonb not null default '[]',
  total_price numeric(10,2) not null,
  saving_amount numeric(10,2) not null default 0,
  payment_plan_months integer,
  payment_plan_amount_per_month numeric(10,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table care_package_enrollments (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references care_packages(id),
  patient_id uuid not null references patients(id),
  client_id uuid not null references clients(id),
  vet_id uuid not null references users(id),
  start_date date not null,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled')),
  sessions_used integer not null default 0,
  sessions_total integer not null,
  payments_made integer not null default 0,
  payments_total integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table care_package_payments (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references care_package_enrollments(id) on delete cascade,
  due_date date not null,
  paid_date date,
  amount numeric(10,2) not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'paid', 'overdue')),
  invoice_id uuid references invoices(id),
  created_at timestamptz not null default now()
);

-- ============================================
-- REMINDERS & COMMUNICATIONS
-- ============================================
create table reminders (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id),
  client_id uuid not null references clients(id),
  practice_id uuid not null references practices(id),
  type text not null check (type in ('vaccination', 'followup', 'wellness', 'appointment', 'custom')),
  due_date date not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  message text,
  channel text not null default 'email' check (channel in ('email', 'sms')),
  created_at timestamptz not null default now()
);

create table communication_logs (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id),
  practice_id uuid not null references practices(id),
  type text not null check (type in ('email', 'sms')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  subject text,
  body text,
  sent_at timestamptz,
  template_used text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'failed')),
  created_at timestamptz not null default now()
);

-- ============================================
-- AUDIT LOG
-- ============================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  practice_id uuid references practices(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'finalise')),
  changes jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ============================================
-- FILE ATTACHMENTS
-- ============================================
create table file_attachments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id),
  appointment_id uuid references appointments(id),
  practice_id uuid not null references practices(id),
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  uploaded_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_patients_practice on patients(practice_id);
create index idx_patients_owner on patients(owner_id);
create index idx_patients_search on patients using gin(to_tsvector('english', name));
create index idx_appointments_date on appointments(date, practice_id);
create index idx_appointments_vet on appointments(vet_id, date);
create index idx_appointments_patient on appointments(patient_id);
create index idx_appointments_clinical_status on appointments(clinical_status, practice_id);
create index idx_appointment_addendums_appointment on appointment_addendums(appointment_id);
create index idx_patient_bcs_patient on patient_bcs(patient_id);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_practice on invoices(practice_id, status);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
create index idx_clients_practice on client_practices(practice_id);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table practices enable row level security;
alter table users enable row level security;
alter table user_practices enable row level security;
alter table clients enable row level security;
alter table client_practices enable row level security;
alter table patients enable row level security;
alter table patient_bcs enable row level security;
alter table appointments enable row level security;
alter table appointment_addendums enable row level security;
alter table prescriptions enable row level security;
alter table products enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table care_packages enable row level security;
alter table care_package_enrollments enable row level security;
alter table care_package_payments enable row level security;
alter table reminders enable row level security;
alter table communication_logs enable row level security;
alter table audit_logs enable row level security;
alter table file_attachments enable row level security;

-- ── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_practice_member(p_practice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_practices
    WHERE user_id = auth.uid()
      AND practice_id = p_practice_id
      AND (role != 'locum' OR access_expires_at IS NULL OR access_expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION my_role_in(p_practice_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_practices
  WHERE user_id = auth.uid()
    AND practice_id = p_practice_id
    AND (role != 'locum' OR access_expires_at IS NULL OR access_expires_at > now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_clinical_access(p_practice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT my_role_in(p_practice_id) IN ('owner', 'clinic_owner', 'vet', 'locum');
$$;

CREATE OR REPLACE FUNCTION has_admin_access(p_practice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT my_role_in(p_practice_id) IN ('owner', 'clinic_owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION is_practice_owner(p_practice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT my_role_in(p_practice_id) IN ('owner', 'clinic_owner');
$$;

CREATE OR REPLACE FUNCTION my_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── PRACTICES ──────────────────────────────────────────────────────────────

CREATE POLICY "member_can_view_practice"
  ON practices FOR SELECT USING (is_practice_member(id));

CREATE POLICY "owner_can_update_practice"
  ON practices FOR UPDATE USING (is_practice_owner(id));

CREATE POLICY "owner_can_insert_practice"
  ON practices FOR INSERT WITH CHECK (true);

-- ── USER_PRACTICES ─────────────────────────────────────────────────────────

CREATE POLICY "view_memberships"
  ON user_practices FOR SELECT
  USING (user_id = auth.uid() OR is_practice_owner(practice_id));

CREATE POLICY "owner_manages_memberships"
  ON user_practices FOR ALL
  USING (is_practice_owner(practice_id))
  WITH CHECK (is_practice_owner(practice_id));

-- ── USERS ──────────────────────────────────────────────────────────────────

CREATE POLICY "view_own_profile"
  ON users FOR SELECT USING (id = auth.uid());

CREATE POLICY "practice_members_see_colleagues"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_practices up1
      JOIN user_practices up2 ON up1.practice_id = up2.practice_id
      WHERE up1.user_id = auth.uid() AND up2.user_id = users.id
    )
  );

CREATE POLICY "update_own_profile"
  ON users FOR UPDATE USING (id = auth.uid());

-- ── CLIENTS ────────────────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_clients"
  ON clients FOR SELECT
  USING (
    id = my_client_id()
    OR EXISTS (
      SELECT 1 FROM client_practices cp
      WHERE cp.client_id = clients.id AND is_practice_member(cp.practice_id)
    )
  );

CREATE POLICY "staff_can_insert_clients"
  ON clients FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_can_update_clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_practices cp
      WHERE cp.client_id = clients.id AND has_admin_access(cp.practice_id)
    )
  );

-- ── PATIENTS ───────────────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_patients"
  ON patients FOR SELECT
  USING (is_practice_member(practice_id) OR owner_id = my_client_id());

CREATE POLICY "staff_can_insert_patients"
  ON patients FOR INSERT WITH CHECK (is_practice_member(practice_id));

CREATE POLICY "staff_can_update_patients"
  ON patients FOR UPDATE USING (is_practice_member(practice_id));

-- ── PATIENT_BCS ────────────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_bcs"
  ON patient_bcs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_bcs.patient_id AND is_practice_member(p.practice_id)
    )
  );

CREATE POLICY "staff_can_manage_bcs"
  ON patient_bcs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_bcs.patient_id AND is_practice_member(p.practice_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_bcs.patient_id AND is_practice_member(p.practice_id)
    )
  );

-- ── APPOINTMENTS ───────────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_appointments"
  ON appointments FOR SELECT
  USING (is_practice_member(practice_id) OR client_id = my_client_id());

CREATE POLICY "staff_can_insert_appointments"
  ON appointments FOR INSERT WITH CHECK (is_practice_member(practice_id));

CREATE POLICY "client_can_book_appointment"
  ON appointments FOR INSERT WITH CHECK (client_id = my_client_id());

CREATE POLICY "staff_can_update_appointments"
  ON appointments FOR UPDATE USING (is_practice_member(practice_id));

CREATE POLICY "client_can_cancel_own_appointment"
  ON appointments FOR UPDATE
  USING (client_id = my_client_id() AND status IN ('scheduled', 'confirmed'));

-- No DELETE policy on appointments

-- ── APPOINTMENT_ADDENDUMS ──────────────────────────────────────────────────

-- Only clinical staff can view/create addendums; no UPDATE or DELETE
CREATE POLICY "clinical_staff_can_view_addendums"
  ON appointment_addendums FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_addendums.appointment_id
        AND has_clinical_access(a.practice_id)
    )
  );

CREATE POLICY "clinical_staff_can_insert_addendums"
  ON appointment_addendums FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_addendums.appointment_id
        AND has_clinical_access(a.practice_id)
    )
  );

-- ── PRESCRIPTIONS ──────────────────────────────────────────────────────────

-- Clinical only. No DELETE.
CREATE POLICY "clinical_staff_can_view_prescriptions"
  ON prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = prescriptions.appointment_id AND has_clinical_access(a.practice_id)
    )
  );

CREATE POLICY "clinical_staff_can_insert_prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = prescriptions.appointment_id AND has_clinical_access(a.practice_id)
    )
  );

CREATE POLICY "clinical_staff_can_update_prescriptions"
  ON prescriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = prescriptions.appointment_id AND has_clinical_access(a.practice_id)
    )
  );

-- ── PRODUCTS ───────────────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_products"
  ON products FOR SELECT USING (is_practice_member(practice_id));

CREATE POLICY "admin_can_manage_products"
  ON products FOR ALL
  USING (has_admin_access(practice_id))
  WITH CHECK (has_admin_access(practice_id));

-- ── INVOICES ───────────────────────────────────────────────────────────────

CREATE POLICY "can_view_invoices"
  ON invoices FOR SELECT
  USING (
    has_admin_access(practice_id)
    OR (has_clinical_access(practice_id) AND performing_vet_id = auth.uid())
    OR client_id = my_client_id()
  );

CREATE POLICY "staff_can_insert_invoices"
  ON invoices FOR INSERT
  WITH CHECK (has_admin_access(practice_id) OR has_clinical_access(practice_id));

CREATE POLICY "admin_can_update_unpaid_invoices"
  ON invoices FOR UPDATE
  USING (has_admin_access(practice_id) AND status != 'paid');

CREATE POLICY "owner_can_update_any_invoice"
  ON invoices FOR UPDATE USING (is_practice_owner(practice_id));

-- ── INVOICE_LINE_ITEMS ─────────────────────────────────────────────────────

CREATE POLICY "inherit_invoice_access_for_line_items"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          has_admin_access(i.practice_id)
          OR (has_clinical_access(i.practice_id) AND i.performing_vet_id = auth.uid())
          OR i.client_id = my_client_id()
        )
    )
  );

CREATE POLICY "staff_can_manage_line_items"
  ON invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (has_admin_access(i.practice_id) OR has_clinical_access(i.practice_id))
    )
  );

-- ── AUDIT_LOGS ─────────────────────────────────────────────────────────────

CREATE POLICY "owners_can_view_audit_logs"
  ON audit_logs FOR SELECT USING (is_practice_owner(practice_id));

-- No INSERT policy for authenticated users — use write_audit_log() function only.

-- ── FILE_ATTACHMENTS ───────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_files"
  ON file_attachments FOR SELECT USING (is_practice_member(practice_id));

CREATE POLICY "staff_can_insert_files"
  ON file_attachments FOR INSERT
  WITH CHECK (is_practice_member(practice_id) AND uploaded_by = auth.uid());

-- No DELETE for files (soft-delete via application layer if needed)

-- ── CARE PACKAGES ──────────────────────────────────────────────────────────

CREATE POLICY "staff_can_view_care_packages"
  ON care_packages FOR SELECT USING (is_practice_member(practice_id));

CREATE POLICY "admin_can_manage_care_packages"
  ON care_packages FOR ALL
  USING (has_admin_access(practice_id))
  WITH CHECK (has_admin_access(practice_id));

CREATE POLICY "staff_can_view_enrollments"
  ON care_package_enrollments FOR SELECT
  USING (
    client_id = my_client_id()
    OR EXISTS (
      SELECT 1 FROM care_packages cp
      WHERE cp.id = care_package_enrollments.package_id AND is_practice_member(cp.practice_id)
    )
  );

CREATE POLICY "admin_can_manage_enrollments"
  ON care_package_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM care_packages cp
      WHERE cp.id = care_package_enrollments.package_id AND has_admin_access(cp.practice_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM care_packages cp
      WHERE cp.id = care_package_enrollments.package_id AND has_admin_access(cp.practice_id)
    )
  );

CREATE POLICY "staff_can_manage_reminders"
  ON reminders FOR ALL
  USING (is_practice_member(practice_id))
  WITH CHECK (is_practice_member(practice_id));

CREATE POLICY "staff_can_view_comm_logs"
  ON communication_logs FOR SELECT USING (is_practice_member(practice_id));

CREATE POLICY "system_can_insert_comm_logs"
  ON communication_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on practices for each row execute function update_updated_at();
create trigger set_updated_at before update on users for each row execute function update_updated_at();
create trigger set_updated_at before update on clients for each row execute function update_updated_at();
create trigger set_updated_at before update on patients for each row execute function update_updated_at();
create trigger set_updated_at before update on appointments for each row execute function update_updated_at();
create trigger set_updated_at before update on products for each row execute function update_updated_at();
create trigger set_updated_at before update on invoices for each row execute function update_updated_at();
create trigger set_updated_at before update on care_package_enrollments for each row execute function update_updated_at();

-- ============================================
-- TRIGGER: auto-create user record on signup
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
