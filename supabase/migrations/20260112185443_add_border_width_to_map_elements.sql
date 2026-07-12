/*
  # Add Border Width to Map Elements

  1. Changes
    - Add `border_width` column to `map_elements` table to allow customizable border thickness
    - Default value is 2 (pixels) for backward compatibility

  2. Notes
    - This allows users to customize the border thickness of box elements on the map
    - Values typically range from 0 (no border) to 8 (thick border)
*/

-- Add border_width column to map_elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'border_width'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN border_width integer DEFAULT 2 NOT NULL;
  END IF;
END $$;