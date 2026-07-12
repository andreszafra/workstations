/*
  # Update Map Elements - Add Image Support

  1. Changes
    - Add `image_url` column to `map_elements` table for storing icon/image URLs
    - Add `border_radius` column for styling flexibility
    
  2. Notes
    - Supports adding custom PNG icons and images to the map
    - Images can be hosted externally or from stock photo sites
*/

-- Add image_url column to map_elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN image_url text DEFAULT '';
  END IF;
END $$;

-- Add border_radius column for styling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'border_radius'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN border_radius integer DEFAULT 0;
  END IF;
END $$;