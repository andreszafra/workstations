/*
  # Add Operational Type to Workstation Types

  1. Changes
    - Add `is_operational` column to `workstation_types` table
    - This allows categorizing workstations as operational (production/service) vs administrative (management/support)
    - Both flags can be false for mixed/other types
    - Defaults to false to maintain backward compatibility
  
  2. Notes
    - A workstation type can be both operational and administrative
    - This provides flexibility for hybrid roles
*/

-- Add is_operational column to workstation_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstation_types' AND column_name = 'is_operational'
  ) THEN
    ALTER TABLE workstation_types 
    ADD COLUMN is_operational boolean DEFAULT false NOT NULL;
  END IF;
END $$;
