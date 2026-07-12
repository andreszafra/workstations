/*
  # Add Map Features

  1. New Columns
    - `workstations.rotation` (integer) - Rotation angle in degrees (0-360)
  
  2. New Tables
    - `map_elements`
      - `id` (uuid, primary key)
      - `site_id` (uuid, foreign key to sites)
      - `type` (text) - Type of element: 'box', 'wall', 'label', 'room'
      - `position_x` (integer) - X position on map
      - `position_y` (integer) - Y position on map
      - `width` (integer) - Width of element
      - `height` (integer) - Height of element
      - `rotation` (integer) - Rotation angle in degrees
      - `color` (text) - Color of element (hex or color name)
      - `label` (text) - Optional label text
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on `map_elements` table
    - Add policies for public access (matching existing workstations policies)
*/

-- Add rotation column to workstations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'rotation'
  ) THEN
    ALTER TABLE workstations ADD COLUMN rotation integer DEFAULT 0;
  END IF;
END $$;

-- Create map_elements table
CREATE TABLE IF NOT EXISTS map_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'box',
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  width integer DEFAULT 100,
  height integer DEFAULT 100,
  rotation integer DEFAULT 0,
  color text DEFAULT '#94a3b8',
  label text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE map_elements ENABLE ROW LEVEL SECURITY;

-- Create policies for map_elements
CREATE POLICY "Allow public to view map elements"
  ON map_elements FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public to insert map elements"
  ON map_elements FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public to update map elements"
  ON map_elements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete map elements"
  ON map_elements FOR DELETE TO anon, authenticated USING (true);