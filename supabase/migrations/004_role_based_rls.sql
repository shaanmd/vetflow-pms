-- Migration 004: replace basic RLS with role-based policies
-- Drop all existing policies and the basic helper function

DROP POLICY IF EXISTS "Users see own profile" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Users see own practice links" ON user_practices;
DROP POLICY IF EXISTS "Users see their practices" ON practices;
DROP POLICY IF EXISTS "Users see practice clients" ON clients;
DROP POLICY IF EXISTS "Users manage practice clients" ON clients;
DROP POLICY IF EXISTS "Users see practice patients" ON patients;
DROP POLICY IF EXISTS "Users manage practice patients" ON patients;
DROP POLICY IF EXISTS "Users see practice bcs" ON patient_bcs;
DROP POLICY IF EXISTS "Users manage practice bcs" ON patient_bcs;
DROP POLICY IF EXISTS "Users see practice appointments" ON appointments;
DROP POLICY IF EXISTS "Users manage practice appointments" ON appointments;
DROP POLICY IF EXISTS "Users see practice appointment addendums" ON appointment_addendums;
DROP POLICY IF EXISTS "Users manage practice appointment addendums" ON appointment_addendums;
DROP POLICY IF EXISTS "Users see practice invoices" ON invoices;
DROP POLICY IF EXISTS "Users manage practice invoices" ON invoices;
DROP POLICY IF EXISTS "Users see practice products" ON products;
DROP POLICY IF EXISTS "Users manage practice products" ON products;
DROP POLICY IF EXISTS "Users see practice audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users see practice files" ON file_attachments;
DROP POLICY IF EXISTS "Users manage practice files" ON file_attachments;

DROP FUNCTION IF EXISTS get_user_practice_ids();

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

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

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

-- Drop old policy
DROP POLICY IF EXISTS "Users see practice audit logs" ON audit_logs;

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

ALTER TABLE care_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_package_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_package_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

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
