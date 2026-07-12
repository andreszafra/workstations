/*
  # Add floor field to workstations

  1. Changes
    - Add `floor` column to `workstations` table
      - Type: integer
      - Default: 0 (ground floor)
      - Not null
    - Add index on floor for efficient filtering

  2. Notes
    - Floor 0 represents ground floor
    - Positive numbers represent floors above ground
    - Negative numbers could represent basement floors
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'floor'
  ) THEN
    ALTER TABLE workstations ADD COLUMN floor integer DEFAULT 0 NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_workstations_floor ON workstations(floor);
  END IF;
END $$;
