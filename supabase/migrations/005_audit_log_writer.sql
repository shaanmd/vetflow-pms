-- Migration 005: secure audit log writer
-- Authenticated users cannot INSERT directly into audit_logs.
-- All writes must go through this SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION write_audit_log(
  p_practice_id  uuid,
  p_entity_type  text,
  p_entity_id    uuid,
  p_action       text,
  p_changes      jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, practice_id, entity_type, entity_id, action, changes)
  VALUES (auth.uid(), p_practice_id, p_entity_type, p_entity_id, p_action, p_changes);
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION write_audit_log(uuid, text, uuid, text, jsonb) TO authenticated;
