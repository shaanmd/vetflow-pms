-- Migration 006: prevent editing of finalised consult notes
-- Once clinical_status = 'finalised', clinical fields are immutable.
-- Use appointment_addendums for corrections.

CREATE OR REPLACE FUNCTION prevent_finalised_consult_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- If the record was already finalised and is still finalised, block clinical field changes
  IF OLD.clinical_status = 'finalised' AND NEW.clinical_status = 'finalised' THEN
    IF (
      OLD.presenting_complaint IS DISTINCT FROM NEW.presenting_complaint OR
      OLD.history              IS DISTINCT FROM NEW.history              OR
      OLD.examination          IS DISTINCT FROM NEW.examination          OR
      OLD.diagnosis            IS DISTINCT FROM NEW.diagnosis            OR
      OLD.treatment_plan       IS DISTINCT FROM NEW.treatment_plan       OR
      OLD.notes_transcript     IS DISTINCT FROM NEW.notes_transcript     OR
      OLD.notes_ai_generated   IS DISTINCT FROM NEW.notes_ai_generated
    ) THEN
      RAISE EXCEPTION 'Clinical notes are finalised and cannot be edited. Create an addendum instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_finalised_consult
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION prevent_finalised_consult_edit();
