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

-- Weight history
create table patient_weights (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  weight_kg numeric(7,2) not null,
  recorded_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================
-- APPOINTMENTS
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- CONSULTS (Clinical Records)
-- ============================================
create table consults (
  id uuid primary key default uuid_generate_v4(),
  consult_date date not null, -- User-chosen date (NOT auto-set) — #1 IDEXX pain point fix
  appointment_id uuid references appointments(id),
  patient_id uuid not null references patients(id),
  vet_id uuid not null references users(id),
  practice_id uuid not null references practices(id),
  presenting_complaint text,
  history text,
  examination text,
  diagnosis text,
  treatment_plan text,
  notes_transcript text,      -- VetScribe raw transcript
  notes_ai_generated text,    -- VetScribe AI output
  template_used text,
  status text not null default 'draft' check (status in ('draft', 'finalised')),
  finalised_at timestamptz,
  finalised_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

-- Consult addendums (for finalised consults)
create table consult_addendums (
  id uuid primary key default uuid_generate_v4(),
  consult_id uuid not null references consults(id) on delete cascade,
  content text not null,
  added_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- ============================================
-- PRESCRIPTIONS
-- ============================================
create table prescriptions (
  id uuid primary key default uuid_generate_v4(),
  consult_id uuid not null references consults(id),
  patient_id uuid not null references patients(id),
  medication text not null,
  dose text,
  frequency text,
  duration text,
  quantity text,
  instructions text,
  dispensed boolean not null default false,
  dispensed_date date,
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
  consult_id uuid references consults(id),
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
  consult_id uuid references consults(id),
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
create index idx_consults_patient on consults(patient_id);
create index idx_consults_date on consults(consult_date, practice_id);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_practice on invoices(practice_id, status);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
create index idx_clients_practice on client_practices(practice_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table practices enable row level security;
alter table users enable row level security;
alter table user_practices enable row level security;
alter table clients enable row level security;
alter table client_practices enable row level security;
alter table patients enable row level security;
alter table patient_weights enable row level security;
alter table appointments enable row level security;
alter table consults enable row level security;
alter table consult_addendums enable row level security;
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

-- Helper function: get practice IDs for current user
create or replace function get_user_practice_ids()
returns uuid[] as $$
  select array_agg(practice_id) from user_practices where user_id = auth.uid();
$$ language sql security definer stable;

-- RLS Policies: users can only see data for their practices
create policy "Users see own profile" on users for select using (id = auth.uid());
create policy "Users update own profile" on users for update using (id = auth.uid());

create policy "Users see own practice links" on user_practices for select
  using (user_id = auth.uid());

create policy "Users see their practices" on practices for select
  using (id = any(get_user_practice_ids()));

create policy "Users see practice clients" on clients for select
  using (id in (
    select client_id from client_practices where practice_id = any(get_user_practice_ids())
  ));

create policy "Users manage practice clients" on clients for all
  using (id in (
    select client_id from client_practices where practice_id = any(get_user_practice_ids())
  ));

create policy "Users see practice patients" on patients for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users manage practice patients" on patients for all
  using (practice_id = any(get_user_practice_ids()));

create policy "Users see practice weights" on patient_weights for select
  using (patient_id in (select id from patients where practice_id = any(get_user_practice_ids())));

create policy "Users see practice appointments" on appointments for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users manage practice appointments" on appointments for all
  using (practice_id = any(get_user_practice_ids()));

create policy "Users see practice consults" on consults for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users manage practice consults" on consults for all
  using (practice_id = any(get_user_practice_ids()));

create policy "Users see practice invoices" on invoices for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users manage practice invoices" on invoices for all
  using (practice_id = any(get_user_practice_ids()));

create policy "Users see practice products" on products for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users manage practice products" on products for all
  using (practice_id = any(get_user_practice_ids()));

create policy "Users see practice audit logs" on audit_logs for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users see practice files" on file_attachments for select
  using (practice_id = any(get_user_practice_ids()));

create policy "Users manage practice files" on file_attachments for all
  using (practice_id = any(get_user_practice_ids()));

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
create trigger set_updated_at before update on consults for each row execute function update_updated_at();
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
