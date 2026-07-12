/*
  # Add border_color to map_elements

  1. Changes
    - Add `border_color` column to `map_elements` table for custom border colors
    - Default value is '#000000' (black)
  
  2. Notes
    - This field allows users to customize the border color of map elements separately from the fill color
*/

-- Add border_color column to map_elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'border_color'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN border_color text DEFAULT '#000000';
  END IF;
END $$;