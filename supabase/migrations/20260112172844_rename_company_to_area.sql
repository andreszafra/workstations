/*
  # Rename company field to area

  1. Changes
    - Rename `company` column to `area` in `employees` table
    
  2. Notes
    - This is a safe rename operation that preserves all existing data
    - All existing values will remain intact
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'company'
  ) THEN
    ALTER TABLE employees RENAME COLUMN company TO area;
  END IF;
END $$;
