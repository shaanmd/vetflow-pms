-- ============================================
-- VetFlowPMS Demo Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================
-- NOTE: You must create a user via Supabase Auth first (email/password).
--       Then update the user ID below to match your auth.users.id.
--       The handle_new_user() trigger will auto-create the public.users row.

-- ============================================
-- STEP 1: Update this ID to match YOUR auth user
-- Go to Supabase Dashboard > Authentication > Users, copy your user's UUID
-- ============================================
DO $$
DECLARE
  owner_id uuid := (SELECT id FROM auth.users LIMIT 1); -- grabs first auth user
  practice1_id uuid;
  practice2_id uuid;
  -- clients
  client_sarah uuid;
  client_tom uuid;
  client_jane uuid;
  client_mike uuid;
  client_lisa uuid;
  client_emma uuid;
  client_david uuid;
  client_rachel uuid;
  -- patients
  pat_max uuid;
  pat_bella uuid;
  pat_cooper uuid;
  pat_thunder uuid;
  pat_milo uuid;
  pat_luna uuid;
  pat_rocky uuid;
  pat_willow uuid;
  pat_scout uuid;
  pat_storm uuid;
  -- appointments (today)
  apt1 uuid;
  apt2 uuid;
  apt3 uuid;
  apt4 uuid;
  -- appointments (past, with clinical notes)
  apt_cooper_wk6 uuid;
  apt_bella_dental uuid;
  apt_rocky_oa uuid;
  apt_scout_dm uuid;
  -- invoices
  inv1 uuid;
  inv2 uuid;
  inv3 uuid;
  inv4 uuid;
  inv5 uuid;
  -- products
  prod_consult uuid;
  prod_rehab_init uuid;
  prod_rehab_followup uuid;
  prod_equine_dental uuid;
  prod_equine_biomech uuid;
  prod_palliative uuid;
  prod_vaccination uuid;
  prod_xray uuid;
  prod_meloxicam uuid;
  prod_joint_supp uuid;
BEGIN

-- ============================================
-- PRACTICES
-- ============================================
INSERT INTO practices (id, name, entity_name, abn, timezone, currency, tax_rate, address, phone, email, settings)
VALUES
  (gen_random_uuid(), 'Sunrise Mobile Vet', 'Sunrise Mobile Vet Pty Ltd', '12 345 678 901',
   'Australia/Brisbane', 'AUD', 10.00,
   '42 Jacaranda Drive, Toowoomba QLD 4350', '0400 123 456', 'hello@sunrisemobilevet.com.au',
   '{"invoice_prefix": "SM", "travel_buffer_minutes": 30, "appointment_types": [
     {"id": "consult", "name": "General Consult", "duration_minutes": 30, "colour": "#3b82f6", "price": 120},
     {"id": "equine-dental", "name": "Equine Dental", "duration_minutes": 60, "colour": "#22c55e", "price": 350},
     {"id": "equine-biomech", "name": "Equine Biomechanical", "duration_minutes": 60, "colour": "#f59e0b", "price": 280},
     {"id": "palliative", "name": "Palliative Consult", "duration_minutes": 45, "colour": "#8b5cf6", "price": 150},
     {"id": "vaccination", "name": "Vaccination", "duration_minutes": 20, "colour": "#06b6d4", "price": 85}
   ]}'::jsonb)
RETURNING id INTO practice1_id;

INSERT INTO practices (id, name, entity_name, abn, timezone, currency, tax_rate, address, phone, email, settings)
VALUES
  (gen_random_uuid(), 'Sunrise Canine Rehab', 'Sunrise Canine Rehab Pty Ltd', '12 345 678 902',
   'Australia/Brisbane', 'AUD', 10.00,
   '15 Wellness Way, Toowoomba QLD 4350', '0400 123 457', 'rehab@sunrisemobilevet.com.au',
   '{"invoice_prefix": "SR", "travel_buffer_minutes": 15, "appointment_types": [
     {"id": "rehab-initial", "name": "Rehab Initial Assessment", "duration_minutes": 90, "colour": "#a855f7", "price": 220},
     {"id": "rehab-followup", "name": "Rehab Follow-up", "duration_minutes": 45, "colour": "#3b82f6", "price": 130},
     {"id": "hydro", "name": "Hydrotherapy Session", "duration_minutes": 45, "colour": "#06b6d4", "price": 95}
   ]}'::jsonb)
RETURNING id INTO practice2_id;

-- ============================================
-- LINK OWNER USER TO PRACTICES
-- ============================================
-- Update existing user name
UPDATE users SET name = 'Dr Alex Taylor' WHERE id = owner_id;

INSERT INTO user_practices (user_id, practice_id, role) VALUES
  (owner_id, practice1_id, 'owner'),
  (owner_id, practice2_id, 'owner');

-- ============================================
-- CLIENTS
-- ============================================
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Sarah Johnson', 'sarah.johnson@email.com', '0412 345 001', '18 Maple St, Toowoomba QLD 4350') RETURNING id INTO client_sarah;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Tom Richards', 'tom.richards@email.com', '0412 345 002', 'Sunshine Stables, 220 Range Rd, Highfields QLD 4352') RETURNING id INTO client_tom;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Jane Smith', 'jane.smith@email.com', '0412 345 003', '7 Banksia Crt, Toowoomba QLD 4350') RETURNING id INTO client_jane;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Mike O''Brien', 'mike.obrien@email.com', '0412 345 004', 'Willowdale Farm, 85 Creek Rd, Cabarlah QLD 4352') RETURNING id INTO client_mike;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Lisa Chen', 'lisa.chen@email.com', '0412 345 005', '3/22 Russell St, Toowoomba QLD 4350') RETURNING id INTO client_lisa;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Emma Williams', 'emma.williams@email.com', '0412 345 006', '91 Bridge St, Toowoomba QLD 4350') RETURNING id INTO client_emma;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'David Park', 'david.park@email.com', '0412 345 007', '45 Spring St, Toowoomba QLD 4350') RETURNING id INTO client_david;
INSERT INTO clients (id, name, email, phone, address) VALUES
  (gen_random_uuid(), 'Rachel Adams', 'rachel.adams@email.com', '0412 345 008', 'Greenhill Equestrian, 310 New England Hwy, Highfields QLD 4352') RETURNING id INTO client_rachel;

-- Link clients to practices
INSERT INTO client_practices (client_id, practice_id) VALUES
  (client_sarah, practice1_id), (client_sarah, practice2_id),
  (client_tom, practice1_id),
  (client_jane, practice2_id),
  (client_mike, practice1_id),
  (client_lisa, practice1_id),
  (client_emma, practice2_id),
  (client_david, practice1_id),
  (client_rachel, practice1_id);

-- ============================================
-- PATIENTS — Sunrise Mobile Vet
-- ============================================
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Max', 'dog', 'German Shepherd', 'Male (neutered)', '2020-03-15', '900012345678901', 'active', '{"Penicillin"}', '{"Hip dysplasia"}', client_sarah, practice1_id) RETURNING id INTO pat_max;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Bella', 'horse', 'Thoroughbred', 'Mare', '2018-09-22', NULL, 'active', '{}', '{"Recurring dental hooks"}', client_tom, practice1_id) RETURNING id INTO pat_bella;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Thunder', 'horse', 'Quarter Horse', 'Gelding', '2016-05-10', NULL, 'active', '{}', '{"Mild navicular syndrome"}', client_mike, practice1_id) RETURNING id INTO pat_thunder;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Milo', 'cat', 'Domestic Shorthair', 'Male (neutered)', '2021-11-01', '900012345678905', 'active', '{}', '{}', client_lisa, practice1_id) RETURNING id INTO pat_milo;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Rocky', 'dog', 'Labrador Retriever', 'Male', '2019-07-20', '900012345678907', 'active', '{}', '{"Osteoarthritis (bilateral stifles)"}', client_david, practice1_id) RETURNING id INTO pat_rocky;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Storm', 'horse', 'Warmblood', 'Gelding', '2015-02-14', NULL, 'active', '{}', '{"Left forelimb lameness (grade 2)"}', client_rachel, practice1_id) RETURNING id INTO pat_storm;

-- PATIENTS — Sunrise Canine Rehab
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Cooper', 'dog', 'Golden Retriever', 'Male (neutered)', '2019-01-08', '900012345678903', 'active', '{}', '{"Post-TPLO surgery (right stifle)", "Mild muscle atrophy"}', client_jane, practice2_id) RETURNING id INTO pat_cooper;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Luna', 'dog', 'Border Collie', 'Female (spayed)', '2020-06-12', '900012345678906', 'active', '{}', '{"Intervertebral disc disease (IVDD) — post-surgery"}', client_emma, practice2_id) RETURNING id INTO pat_luna;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Willow', 'dog', 'Cavalier King Charles', 'Female', '2021-04-03', '900012345678908', 'active', '{"NSAIDs"}', '{"Patella luxation (grade 2)"}', client_sarah, practice2_id) RETURNING id INTO pat_willow;
INSERT INTO patients (id, name, species, breed, sex, dob, microchip, status, allergies, conditions, owner_id, practice_id) VALUES
  (gen_random_uuid(), 'Scout', 'dog', 'Australian Cattle Dog', 'Male (neutered)', '2018-12-25', '900012345678909', 'active', '{}', '{"Degenerative myelopathy — early stage"}', client_jane, practice2_id) RETURNING id INTO pat_scout;

-- ============================================
-- BCS (Body Condition Score) HISTORY
-- ============================================
-- Scale: 1–9, where 5 is ideal
INSERT INTO patient_bcs (patient_id, bcs, assessed_at, assessed_by) VALUES
  -- Max (German Shepherd) — well maintained
  (pat_max, 5, '2025-12-01', owner_id),
  (pat_max, 5, '2026-01-15', owner_id),
  (pat_max, 5, '2026-03-10', owner_id),
  -- Cooper (Golden Retriever) — post-TPLO recovery
  (pat_cooper, 6, '2025-11-20', owner_id),
  (pat_cooper, 5, '2026-01-10', owner_id),
  (pat_cooper, 5, '2026-03-08', owner_id),
  -- Milo (cat) — healthy
  (pat_milo, 5, '2026-01-15', owner_id),
  -- Luna (Border Collie) — post-surgery, gaining condition
  (pat_luna, 4, '2026-02-01', owner_id),
  (pat_luna, 5, '2026-03-01', owner_id),
  -- Rocky (Labrador) — overweight OA, improving with diet
  (pat_rocky, 7, '2025-11-01', owner_id),
  (pat_rocky, 7, '2026-01-10', owner_id),
  (pat_rocky, 6, '2026-03-05', owner_id);

-- ============================================
-- PRODUCTS / SERVICES — Sunrise Mobile Vet
-- ============================================
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'General Consult', 'Standard house-call consultation', 'service', 'consult', practice1_id, 120.00, 10.00) RETURNING id INTO prod_consult;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Equine Dental', 'Full equine dental examination and float', 'service', 'dental', practice1_id, 350.00, 10.00) RETURNING id INTO prod_equine_dental;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Equine Biomechanical Assessment', 'Full biomechanical and lameness evaluation', 'service', 'consult', practice1_id, 280.00, 10.00) RETURNING id INTO prod_equine_biomech;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Palliative Consult', 'End-of-life care and pain management consult', 'service', 'palliative', practice1_id, 150.00, 10.00) RETURNING id INTO prod_palliative;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Vaccination — Canine C5', 'Annual C5 vaccination', 'service', 'vaccination', practice1_id, 85.00, 10.00) RETURNING id INTO prod_vaccination;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'X-ray (per view)', 'Digital radiograph — single view', 'service', 'diagnostic', practice1_id, 95.00, 10.00) RETURNING id INTO prod_xray;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Meloxicam 1.5mg/ml (100ml)', 'NSAID oral suspension', 'product', 'medication', practice1_id, 45.00, 10.00) RETURNING id INTO prod_meloxicam;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), '4CYTE Joint Support (100g)', 'Joint supplement — canine', 'product', 'supplement', practice1_id, 68.00, 10.00) RETURNING id INTO prod_joint_supp;

-- PRODUCTS — Sunrise Canine Rehab
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Rehab Initial Assessment', '90-min initial rehab assessment incl. goniometry', 'service', 'rehab', practice2_id, 220.00, 10.00) RETURNING id INTO prod_rehab_init;
INSERT INTO products (id, name, description, type, category, practice_id, price, tax_rate) VALUES
  (gen_random_uuid(), 'Rehab Follow-up', '45-min rehab follow-up session', 'service', 'rehab', practice2_id, 130.00, 10.00) RETURNING id INTO prod_rehab_followup;
INSERT INTO products (name, description, type, category, practice_id, price, tax_rate) VALUES
  ('Hydrotherapy Session', '45-min underwater treadmill session', 'service', 'rehab', practice2_id, 95.00, 10.00);

-- ============================================
-- APPOINTMENTS — Today (confirmed/scheduled)
-- ============================================
INSERT INTO appointments (id, date, start_time, end_time, duration_minutes, status, appointment_type_id, patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes, notes, clinical_status) VALUES
  (gen_random_uuid(), CURRENT_DATE, '09:00', '09:45', 45, 'confirmed', 'rehab-followup',
   pat_cooper, client_jane, owner_id, practice2_id, 'clinic', NULL, 0,
   'Post-TPLO follow-up — week 8. Check ROM and muscle mass.', 'none') RETURNING id INTO apt1;

INSERT INTO appointments (id, date, start_time, end_time, duration_minutes, status, appointment_type_id, patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes, notes, clinical_status) VALUES
  (gen_random_uuid(), CURRENT_DATE, '10:30', '11:30', 60, 'scheduled', 'equine-dental',
   pat_bella, client_tom, owner_id, practice1_id, 'house_call', 'Sunshine Stables, 220 Range Rd, Highfields QLD 4352', 30,
   'Annual dental check and float', 'none') RETURNING id INTO apt2;

INSERT INTO appointments (id, date, start_time, end_time, duration_minutes, status, appointment_type_id, patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes, notes, clinical_status) VALUES
  (gen_random_uuid(), CURRENT_DATE, '13:00', '14:30', 90, 'confirmed', 'rehab-initial',
   pat_luna, client_emma, owner_id, practice2_id, 'clinic', NULL, 0,
   'Initial rehab assessment — IVDD post-surgery, 6 weeks post-op', 'none') RETURNING id INTO apt3;

INSERT INTO appointments (id, date, start_time, end_time, duration_minutes, status, appointment_type_id, patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes, notes, clinical_status) VALUES
  (gen_random_uuid(), CURRENT_DATE, '15:30', '16:30', 60, 'scheduled', 'equine-biomech',
   pat_thunder, client_mike, owner_id, practice1_id, 'house_call', 'Willowdale Farm, 85 Creek Rd, Cabarlah QLD 4352', 30,
   'Follow-up biomechanical assessment — navicular management', 'none') RETURNING id INTO apt4;

-- ============================================
-- APPOINTMENTS — Future (scheduled)
-- ============================================
INSERT INTO appointments (date, start_time, end_time, duration_minutes, status, appointment_type_id, patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes, notes, clinical_status) VALUES
  (CURRENT_DATE + 1, '09:00', '09:30', 30, 'scheduled', 'consult',
   pat_max, client_sarah, owner_id, practice1_id, 'house_call', '18 Maple St, Toowoomba QLD 4350', 15,
   'Hip dysplasia check — review current management plan', 'none'),
  (CURRENT_DATE + 1, '10:30', '11:15', 45, 'scheduled', 'rehab-followup',
   pat_willow, client_sarah, owner_id, practice2_id, 'clinic', NULL, 0,
   'Patella luxation rehab — session 4 of 6', 'none'),
  (CURRENT_DATE + 2, '09:00', '09:20', 20, 'scheduled', 'vaccination',
   pat_milo, client_lisa, owner_id, practice1_id, 'house_call', '3/22 Russell St, Toowoomba QLD 4350', 15,
   'Annual F3 vaccination', 'none'),
  (CURRENT_DATE + 3, '14:00', '15:00', 60, 'scheduled', 'equine-biomech',
   pat_storm, client_rachel, owner_id, practice1_id, 'house_call', 'Greenhill Equestrian, 310 New England Hwy, Highfields QLD 4352', 30,
   'Lameness re-evaluation — 4 weeks post shoeing change', 'none');

-- ============================================
-- APPOINTMENTS — Past (completed, with clinical notes)
-- ============================================

-- Cooper rehab follow-up — week 6 (finalised)
INSERT INTO appointments (
  id, date, start_time, end_time, duration_minutes, status, appointment_type_id,
  patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes,
  consult_date, presenting_complaint, history, examination, diagnosis, treatment_plan,
  template_used, clinical_status, finalised_at, finalised_by, updated_by
) VALUES (
  gen_random_uuid(),
  CURRENT_DATE - 2, '09:00', '09:45', 45, 'completed', 'rehab-followup',
  pat_cooper, client_jane, owner_id, practice2_id, 'clinic', NULL, 0,
  CURRENT_DATE - 2,
  'Post-TPLO rehabilitation — week 6 follow-up',
  'Cooper underwent right stifle TPLO surgery 6 weeks ago. Has been on restricted activity with controlled leash walks (10 min, 3x daily). Owner reports Cooper is weight-bearing well and keen to be more active.',
  'BCS 5/9. Gait: mild intermittent lameness R hind at trot, sound at walk. Stifle: no drawer, no effusion, mild periarticular thickening. ROM: flexion 42° (prev 38°), extension 155° (prev 148°). Muscle mass: R thigh 38cm (prev 36.5cm), L thigh 41cm. Pain score: 1/5 on palpation.',
  'Post-TPLO right stifle — progressing well. ROM improving. Muscle atrophy reducing.',
  'Continue controlled leash walks, increase to 15 min 3x daily. Begin gentle hill walking. Start sit-to-stand exercises (3 sets of 5, twice daily). Continue 4CYTE joint supplement. Hydrotherapy weekly. Review in 2 weeks.',
  'Rehab Assessment', 'finalised', now() - interval '2 days', owner_id, owner_id
) RETURNING id INTO apt_cooper_wk6;

-- Bella equine dental (finalised)
INSERT INTO appointments (
  id, date, start_time, end_time, duration_minutes, status, appointment_type_id,
  patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes,
  consult_date, presenting_complaint, history, examination, diagnosis, treatment_plan,
  template_used, clinical_status, finalised_at, finalised_by, updated_by
) VALUES (
  gen_random_uuid(),
  CURRENT_DATE - 3, '10:00', '11:00', 60, 'completed', 'equine-dental',
  pat_bella, client_tom, owner_id, practice1_id, 'house_call', 'Sunshine Stables, 220 Range Rd, Highfields QLD 4352', 30,
  CURRENT_DATE - 3,
  'Annual dental examination and float',
  'Bella is a 7yo Thoroughbred mare. Last dental was 14 months ago. Owner reports no issues with eating but has noticed some quidding (dropping feed) in the last 2 weeks.',
  'Oral exam under sedation (detomidine 0.01mg/kg IV). Sharp enamel points on buccal edges of upper arcades (106-111) and lingual edges of lower arcades (306-311). Moderate hooks on 106 and 206. No loose teeth, no periodontal pockets. Wolf teeth previously removed.',
  'Sharp enamel points with moderate hooks — consistent with 14-month interval. Quidding explained by buccal ulceration from 106 hook.',
  'Full mouth float performed. Hooks reduced on 106 and 206. Buccal ulcer on L cheek will resolve spontaneously. Recommend 12-month dental interval. Soft feed for 48 hours post-procedure.',
  'Equine Dental', 'finalised', now() - interval '3 days', owner_id, owner_id
) RETURNING id INTO apt_bella_dental;

-- Rocky OA review (finalised)
INSERT INTO appointments (
  id, date, start_time, end_time, duration_minutes, status, appointment_type_id,
  patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes,
  consult_date, presenting_complaint, history, examination, diagnosis, treatment_plan,
  template_used, clinical_status, finalised_at, finalised_by, updated_by
) VALUES (
  gen_random_uuid(),
  CURRENT_DATE - 5, '13:00', '13:30', 30, 'completed', 'consult',
  pat_rocky, client_david, owner_id, practice1_id, 'house_call', '45 Spring St, Toowoomba QLD 4350', 15,
  CURRENT_DATE - 5,
  'Osteoarthritis review — bilateral stifles',
  'Rocky is a 6yo male Labrador with bilateral stifle OA diagnosed 18 months ago. Currently on meloxicam 0.1mg/kg SID and 4CYTE. Owner reports Rocky is comfortable on flat walks but stiff after longer weekend hikes.',
  'BCS 7/9 (target BCS 5 — overweight). Gait: short-strided hind, bilateral. Stifles: mild bilateral effusion, crepitus on flexion/extension. ROM: flexion 40° bilat, extension 155° bilat. Muscle mass adequate. Pain: 2/5 on deep palpation.',
  'Bilateral stifle osteoarthritis — stable. Mildly overweight contributing to loading.',
  'Continue meloxicam and 4CYTE. Weight reduction plan: reduce kibble by 10%, switch to weight management diet. Limit hikes to 30 min on flat terrain. Consider starting hydrotherapy for low-impact exercise. Review in 6 weeks with BCS check.',
  'SOAP Note', 'finalised', now() - interval '5 days', owner_id, owner_id
) RETURNING id INTO apt_rocky_oa;

-- Scout DM progress check (draft — not yet finalised)
INSERT INTO appointments (
  id, date, start_time, end_time, duration_minutes, status, appointment_type_id,
  patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes,
  consult_date, presenting_complaint, history, examination, diagnosis, treatment_plan,
  template_used, clinical_status, updated_by
) VALUES (
  gen_random_uuid(),
  CURRENT_DATE - 7, '09:30', '10:15', 45, 'completed', 'rehab-followup',
  pat_scout, client_jane, owner_id, practice2_id, 'clinic', NULL, 0,
  CURRENT_DATE - 7,
  'Degenerative myelopathy — rehab progress check',
  'Scout is a 7yo ACD with early-stage degenerative myelopathy diagnosed 3 months ago. On a home exercise program including daily proprioception exercises and controlled walks.',
  'Gait: mild ataxia hind limbs, crossing over at walk intermittently. Proprioception: delayed correction both hind, L worse than R. Muscle mass: hind limbs mildly reduced. No pain on spinal palpation.',
  'Degenerative myelopathy — early stage, slowly progressive. Proprioception declining.',
  NULL,
  'Rehab Assessment', 'draft', owner_id
) RETURNING id INTO apt_scout_dm;

-- Cancelled appointment (no clinical notes)
INSERT INTO appointments (date, start_time, end_time, duration_minutes, status, appointment_type_id, patient_id, client_id, vet_id, practice_id, location_type, location_address, travel_time_minutes, clinical_status) VALUES
  (CURRENT_DATE - 1, '14:00', '14:30', 30, 'cancelled', 'consult',
   pat_milo, client_lisa, owner_id, practice1_id, 'house_call', '3/22 Russell St, Toowoomba QLD 4350', 15, 'none');

-- ============================================
-- APPOINTMENT ADDENDUM
-- ============================================
INSERT INTO appointment_addendums (appointment_id, content, added_by) VALUES
  (apt_rocky_oa, 'Owner called — Rocky tolerating diet change well. Has lost 0.3kg in first 2 weeks. Continuing as planned.', owner_id);

-- ============================================
-- PRESCRIPTIONS
-- ============================================
INSERT INTO prescriptions (appointment_id, patient_id, medication, dose, frequency, duration, quantity, instructions, dispensed, dispensed_date) VALUES
  (apt_rocky_oa, pat_rocky, 'Meloxicam 1.5mg/ml oral suspension', '0.1mg/kg (3.4ml)', 'Once daily with food', 'Ongoing', '100ml bottle', 'Give with food. Do not use with other NSAIDs or corticosteroids. Monitor for GI signs.', true, CURRENT_DATE - 5),
  (apt_rocky_oa, pat_rocky, '4CYTE Canine Joint Support', '1 scoop (4g)', 'Once daily', 'Ongoing', '100g tub', 'Sprinkle on food. Loading dose: double for first 4 weeks.', true, CURRENT_DATE - 5),
  (apt_cooper_wk6, pat_cooper, '4CYTE Canine Joint Support', '1 scoop (4g)', 'Once daily', 'Ongoing', '100g tub', 'Continue as maintenance.', true, CURRENT_DATE - 2);

-- ============================================
-- INVOICES
-- ============================================
INSERT INTO invoices (id, invoice_number, date, due_date, status, client_id, practice_id, appointment_id, performing_vet_id, subtotal, tax_amount, total, paid_at) VALUES
  (gen_random_uuid(), 'SM-0042', CURRENT_DATE - 3, CURRENT_DATE + 11, 'paid', client_tom, practice1_id, apt_bella_dental, owner_id, 350.00, 35.00, 385.00, now() - interval '3 days') RETURNING id INTO inv1;
INSERT INTO invoices (id, invoice_number, date, due_date, status, client_id, practice_id, appointment_id, performing_vet_id, subtotal, tax_amount, total) VALUES
  (gen_random_uuid(), 'SR-0018', CURRENT_DATE - 2, CURRENT_DATE + 12, 'sent', client_jane, practice2_id, apt_cooper_wk6, owner_id, 198.00, 19.80, 217.80) RETURNING id INTO inv2;
INSERT INTO invoices (id, invoice_number, date, due_date, status, client_id, practice_id, appointment_id, performing_vet_id, subtotal, tax_amount, total, paid_at) VALUES
  (gen_random_uuid(), 'SM-0041', CURRENT_DATE - 5, CURRENT_DATE + 9, 'paid', client_david, practice1_id, apt_rocky_oa, owner_id, 233.00, 23.30, 256.30, now() - interval '4 days') RETURNING id INTO inv3;
INSERT INTO invoices (id, invoice_number, date, due_date, status, client_id, practice_id, performing_vet_id, subtotal, tax_amount, total) VALUES
  (gen_random_uuid(), 'SM-0040', CURRENT_DATE - 14, CURRENT_DATE - 1, 'overdue', client_mike, practice1_id, owner_id, 280.00, 28.00, 308.00) RETURNING id INTO inv4;
INSERT INTO invoices (id, invoice_number, date, due_date, status, client_id, practice_id, performing_vet_id, subtotal, tax_amount, total) VALUES
  (gen_random_uuid(), 'SR-0017', CURRENT_DATE - 1, CURRENT_DATE + 13, 'draft', client_emma, practice2_id, owner_id, 220.00, 22.00, 242.00) RETURNING id INTO inv5;

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================
INSERT INTO invoice_line_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, total, sort_order) VALUES
  (inv1, prod_equine_dental, 'Equine Dental — examination and float', 1, 350.00, 10.00, 350.00, 1),
  (inv2, prod_rehab_followup, 'Rehab Follow-up — post-TPLO week 6', 1, 130.00, 10.00, 130.00, 1),
  (inv2, prod_joint_supp, '4CYTE Canine Joint Support (100g)', 1, 68.00, 10.00, 68.00, 2),
  (inv3, prod_consult, 'General Consult — OA review', 1, 120.00, 10.00, 120.00, 1),
  (inv3, prod_meloxicam, 'Meloxicam 1.5mg/ml (100ml)', 1, 45.00, 10.00, 45.00, 2),
  (inv3, prod_joint_supp, '4CYTE Canine Joint Support (100g)', 1, 68.00, 10.00, 68.00, 3),
  (inv4, prod_equine_biomech, 'Equine Biomechanical Assessment', 1, 280.00, 10.00, 280.00, 1),
  (inv5, prod_rehab_init, 'Rehab Initial Assessment — IVDD post-surgery', 1, 220.00, 10.00, 220.00, 1);

-- ============================================
-- REMINDERS
-- ============================================
INSERT INTO reminders (patient_id, client_id, practice_id, type, due_date, status, message, channel) VALUES
  (pat_milo, client_lisa, practice1_id, 'vaccination', CURRENT_DATE + 2, 'pending', 'Milo is due for his annual F3 vaccination.', 'email'),
  (pat_max, client_sarah, practice1_id, 'followup', CURRENT_DATE + 14, 'pending', 'Max is due for a hip dysplasia follow-up.', 'email'),
  (pat_cooper, client_jane, practice2_id, 'appointment', CURRENT_DATE, 'sent', 'Reminder: Cooper has a rehab follow-up today at 9:00 AM.', 'sms'),
  (pat_luna, client_emma, practice2_id, 'appointment', CURRENT_DATE, 'sent', 'Reminder: Luna has an initial rehab assessment today at 1:00 PM.', 'sms');

-- ============================================
-- COMMUNICATION LOG
-- ============================================
INSERT INTO communication_logs (client_id, practice_id, type, direction, subject, body, sent_at, status) VALUES
  (client_jane, practice2_id, 'sms', 'outbound', NULL, 'Hi Jane, just a reminder that Cooper''s rehab follow-up is tomorrow at 9:00 AM. See you then! — Sunrise Canine Rehab', now() - interval '1 day', 'delivered'),
  (client_tom, practice1_id, 'email', 'outbound', 'Invoice SM-0042 — Bella dental', 'Hi Tom, please find attached your invoice for Bella''s dental appointment. Payment can be made via the link below.', now() - interval '3 days', 'delivered'),
  (client_david, practice1_id, 'email', 'outbound', 'Invoice SM-0041 — Rocky OA review', 'Hi David, your invoice for Rocky''s consultation is attached. Payment link included.', now() - interval '5 days', 'delivered'),
  (client_mike, practice1_id, 'email', 'outbound', 'Payment reminder — Invoice SM-0040', 'Hi Mike, this is a friendly reminder that invoice SM-0040 for $308.00 is now overdue. Please pay at your earliest convenience.', now() - interval '1 day', 'delivered');

-- ============================================
-- AUDIT LOG (sample entries)
-- ============================================
INSERT INTO audit_logs (user_id, practice_id, entity_type, entity_id, action, changes) VALUES
  (owner_id, practice2_id, 'appointment', apt_cooper_wk6, 'create', '{"clinical_status": {"old": null, "new": "draft"}}'),
  (owner_id, practice2_id, 'appointment', apt_cooper_wk6, 'finalise', '{"clinical_status": {"old": "draft", "new": "finalised"}}'),
  (owner_id, practice1_id, 'appointment', apt_bella_dental, 'create', '{"clinical_status": {"old": null, "new": "draft"}}'),
  (owner_id, practice1_id, 'appointment', apt_bella_dental, 'finalise', '{"clinical_status": {"old": "draft", "new": "finalised"}}'),
  (owner_id, practice1_id, 'invoice', inv1, 'create', '{"status": {"old": null, "new": "draft"}}'),
  (owner_id, practice1_id, 'invoice', inv4, 'update', '{"status": {"old": "sent", "new": "overdue"}}');

-- ============================================
-- CARE PACKAGES (templates)
-- ============================================
INSERT INTO care_packages (practice_id, name, included_sessions, total_price, saving_amount, payment_plan_months, payment_plan_amount_per_month) VALUES
  (practice2_id, 'Bronze — 6 Sessions', '[{"type": "initial", "qty": 1}, {"type": "followup", "qty": 5}]'::jsonb, 900.00, 185.00, 4, 225.00),
  (practice2_id, 'Silver — 10 Sessions', '[{"type": "initial", "qty": 1}, {"type": "followup", "qty": 9}]'::jsonb, 1450.00, 315.00, 6, 241.67),
  (practice2_id, 'Gold — 14 Sessions', '[{"type": "initial", "qty": 1}, {"type": "followup", "qty": 13}]'::jsonb, 1950.00, 455.00, 7, 278.57);

-- ============================================
-- PRODUCTS — default invoice line items
-- Replace 'YOUR_PRACTICE_UUID' with the actual practice UUID before running
-- ============================================
INSERT INTO products (name, description, type, category, practice_id, price, tax_rate, is_active)
VALUES
  ('Initial Consultation', 'Initial assessment and examination', 'service', 'consultation', 'YOUR_PRACTICE_UUID', 150.00, 10.00, true),
  ('Follow-up Consultation', 'Follow-up examination', 'service', 'consultation', 'YOUR_PRACTICE_UUID', 100.00, 10.00, true),
  ('Equine Dental Float', 'Full dental float under sedation', 'service', 'dental', 'YOUR_PRACTICE_UUID', 350.00, 10.00, true),
  ('Hydrotherapy Session', '30-min underwater treadmill session', 'service', 'rehabilitation', 'YOUR_PRACTICE_UUID', 85.00, 10.00, true),
  ('Laser Therapy', 'Photobiomodulation therapy session', 'service', 'rehabilitation', 'YOUR_PRACTICE_UUID', 65.00, 10.00, true),
  ('Travel Fee - 0-15km', 'House call travel within 15km', 'service', 'travel', 'YOUR_PRACTICE_UUID', 25.00, 10.00, true),
  ('Travel Fee - 15-30km', 'House call travel 15-30km', 'service', 'travel', 'YOUR_PRACTICE_UUID', 45.00, 10.00, true);

END $$;
