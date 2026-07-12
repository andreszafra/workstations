/*
  # Add asset tag prefix to sites table

  1. Changes
    - Add `asset_tag_prefix` column to `sites` table
    - This will store the prefix used when creating workstations for the site
    - Allows consistent naming when adding more workstations later
  
  2. Notes
    - Column is optional since existing sites may not have a prefix
    - Maximum length of 10 characters for the prefix
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'asset_tag_prefix'
  ) THEN
    ALTER TABLE sites ADD COLUMN asset_tag_prefix text;
  END IF;
END $$;
