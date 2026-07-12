/*
  # Add gender field to employees table

  1. Changes
    - Add `gender` column to `employees` table
      - Type: text
      - Options: 'masculino', 'femenino'
      - Nullable: true (optional field)
      - Default: null

  2. Notes
    - This field is optional and can be left empty
    - Used for analytics and demographic reporting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'gender'
  ) THEN
    ALTER TABLE employees ADD COLUMN gender text CHECK (gender IN ('masculino', 'femenino') OR gender IS NULL);
  END IF;
END $$;