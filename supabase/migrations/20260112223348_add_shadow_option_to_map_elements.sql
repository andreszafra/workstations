/*
  # Add Shadow Option to Map Elements

  1. Changes to `map_elements` Table
    - Add `has_shadow` (boolean) - Controls whether the element displays a shadow
      - Default: true (to maintain current behavior)
  
  2. Notes
    - This allows users to toggle shadows on/off for map elements (boxes, icons)
    - Labels already don't have shadows, so this mainly affects boxes and icons
*/

-- Add has_shadow column to map_elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'has_shadow'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN has_shadow boolean DEFAULT true;
  END IF;
END $$;