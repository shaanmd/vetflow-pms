-- Migration 003: add controlled drug fields to prescriptions (QLD Vet Board compliance)
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS schedule            text CHECK (schedule IN ('S2', 'S3', 'S4', 'S8', 'unscheduled')),
  ADD COLUMN IF NOT EXISTS batch_number        text,
  ADD COLUMN IF NOT EXISTS supplier_ref        text,
  ADD COLUMN IF NOT EXISTS withdrawal_period_days int,
  ADD COLUMN IF NOT EXISTS is_controlled       boolean GENERATED ALWAYS AS (schedule IN ('S4', 'S8')) STORED;
