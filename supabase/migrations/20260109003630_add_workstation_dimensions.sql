/*
  # Add Workstation Dimensions

  1. Changes
    - Add `width_cm` column to `workstations` table (default 120cm)
    - Add `height_cm` column to `workstations` table (default 55cm)
    
  2. Notes
    - Workstations will now have physical dimensions in centimeters
    - Default size represents a standard desk: 120cm x 55cm
*/

-- Add width_cm column to workstations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'width_cm'
  ) THEN
    ALTER TABLE workstations ADD COLUMN width_cm integer DEFAULT 120;
  END IF;
END $$;

-- Add height_cm column to workstations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE workstations ADD COLUMN height_cm integer DEFAULT 55;
  END IF;
END $$;