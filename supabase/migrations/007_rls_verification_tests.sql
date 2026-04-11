-- RLS Verification Tests
-- Run each block individually in Supabase SQL editor using the "Set role" context.
-- Replace placeholder UUIDs with actual IDs from your seed data.
-- Each test has an EXPECTED result comment.

-- ────────────────────────────────────────────────────────────────────────────
-- SETUP: You need two practices (A and B), a vet in Practice A, an admin in
-- Practice A, a client in Practice A, and a locum in Practice A with an
-- expired access_expires_at. Seed these via the Supabase seed.sql or manually.
-- ────────────────────────────────────────────────────────────────────────────

-- TEST 1: Vet from Practice A cannot see appointments from Practice B
-- Log in as the Practice A vet user in your app, then in SQL editor:
-- SELECT count(*) FROM appointments WHERE practice_id = '<PRACTICE_B_ID>';
-- EXPECTED: 0 rows

-- TEST 2: Admin cannot see clinical notes (presenting_complaint field)
-- Log in as the Practice A admin user, then:
-- SELECT id, presenting_complaint FROM appointments WHERE practice_id = '<PRACTICE_A_ID>' LIMIT 1;
-- EXPECTED: 0 rows (admin has no SELECT policy on appointments via has_clinical_access check)
-- Note: In this schema appointments use practice-member RLS for SELECT, not clinical-only.
-- The clinical-only restriction is enforced at the APPLICATION LAYER for the note fields.
-- The DB-level restriction is that admin cannot UPDATE clinical fields (no UPDATE policy for admin).

-- TEST 3: Client can only see their own patients
-- Log in as a client user, then:
-- SELECT id, name FROM patients;
-- EXPECTED: Only rows where owner_id matches the client's client record

-- TEST 4: Client cannot see appointment notes at all
-- Log in as a client user, then:
-- SELECT presenting_complaint, diagnosis FROM appointments WHERE client_id = '<CLIENT_ID>';
-- EXPECTED: The select succeeds (clients can see their own appointments) BUT
-- presenting_complaint and diagnosis are visible — the clinical field restriction
-- is application-layer. If you want DB-level restriction, use a VIEW. Document this.

-- TEST 5: Expired locum cannot query any appointments
-- Set access_expires_at to a past date for a locum user in user_practices, then log in as that user:
-- SELECT count(*) FROM appointments;
-- EXPECTED: 0 rows (is_practice_member returns false when access_expires_at < now())

-- TEST 6: Finalised consult cannot be edited via direct SQL
-- Run in SQL editor (as service role this will bypass RLS but test the trigger):
-- UPDATE appointments
--   SET presenting_complaint = 'altered'
--   WHERE id = '<FINALISED_APPT_ID>' AND clinical_status = 'finalised';
-- EXPECTED: ERROR "Clinical notes are finalised and cannot be edited."

-- TEST 7: Authenticated user cannot INSERT directly into audit_logs
-- Log in as any user and try:
-- INSERT INTO audit_logs (user_id, practice_id, entity_type, entity_id, action)
-- VALUES (auth.uid(), '<PRACTICE_ID>', 'test', '<PRACTICE_ID>', 'create');
-- EXPECTED: ERROR "permission denied for table audit_logs"

-- TEST 8: Admin cannot manage products of a practice they don't belong to
-- Log in as Practice A admin, then:
-- INSERT INTO products (name, type, practice_id, price, tax_rate)
-- VALUES ('Fake', 'service', '<PRACTICE_B_ID>', 100, 10);
-- EXPECTED: ERROR "permission denied" or "new row violates row-level security"

-- TEST 9: Client can view their own invoices but not another client's
-- Log in as Client A user, then:
-- SELECT id FROM invoices WHERE client_id = '<CLIENT_B_ID>';
-- EXPECTED: 0 rows

-- TEST 10: Clinical staff can only create addendums attributed to themselves
-- Log in as Vet A, then try to insert an addendum with added_by = '<VET_B_UUID>':
-- INSERT INTO appointment_addendums (appointment_id, content, added_by)
-- VALUES ('<APPT_ID>', 'test', '<VET_B_UUID>');
-- EXPECTED: ERROR "new row violates row-level security" (WITH CHECK requires added_by = auth.uid())
