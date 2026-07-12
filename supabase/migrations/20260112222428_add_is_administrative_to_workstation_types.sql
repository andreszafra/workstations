/*
  # Add is_administrative field to workstation_types

  1. Changes
    - Add `is_administrative` boolean column to `workstation_types` table
    - Default value is false (regular workstations)
  
  2. Notes
    - Administrative workstations will be counted separately in analytics
    - This allows tracking administrative vs regular workstation utilization independently
*/

-- Add is_administrative column to workstation_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstation_types' AND column_name = 'is_administrative'
  ) THEN
    ALTER TABLE workstation_types ADD COLUMN is_administrative boolean DEFAULT false;
  END IF;
END $$;