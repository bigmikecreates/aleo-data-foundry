-- Add unique constraints for idempotent re-insertion

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fees_tx_id_key'
  ) THEN
    ALTER TABLE fees ADD CONSTRAINT fees_tx_id_key UNIQUE (tx_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mapping_changes_unique_key'
  ) THEN
    ALTER TABLE mapping_changes ADD CONSTRAINT mapping_changes_unique_key UNIQUE (tx_id, transition_id, index_in_transition);
  END IF;
END $$;
