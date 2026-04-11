-- Migration 001: rename patient_bcs columns to match application expectations
-- score -> bcs_score, recorded_at -> assessed_at

ALTER TABLE patient_bcs RENAME COLUMN score TO bcs_score;
ALTER TABLE patient_bcs RENAME COLUMN recorded_at TO assessed_at;
