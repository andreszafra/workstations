/*
  # Create Workstation Types and Fixed Assets System

  1. New Tables
    - `workstation_types`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the workstation type (e.g., "Isla", "Individual", "Escritorio en L")
      - `width_cm` (integer) - Default width in pixels
      - `height_cm` (integer) - Default height in pixels
      - `description` (text, optional) - Description of the workstation type
      - `created_at` (timestamptz)

    - `fixed_assets`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the asset (e.g., "Monitor", "Teléfono", "Adaptador de red")
      - `category` (text) - Category of the asset (e.g., "peripherals", "network", "furniture")
      - `description` (text, optional)
      - `created_at` (timestamptz)

    - `workstation_assets`
      - `id` (uuid, primary key)
      - `workstation_id` (uuid, foreign key to workstations)
      - `asset_id` (uuid, foreign key to fixed_assets)
      - `serial_number` (text, optional) - Serial number of this specific asset instance
      - `notes` (text, optional)
      - `assigned_at` (timestamptz)

  2. Changes
    - Add `workstation_type_id` to `workstations` table
    - Keep `type` column temporarily for backward compatibility
    - Add floor field to `map_elements` table

  3. Security
    - Enable RLS on all new tables
    - Add policies for public read access (since the app is public)

  4. Initial Data
    - Create default "Isla" workstation type (120x55 cm)
*/

-- Create workstation_types table
CREATE TABLE IF NOT EXISTS workstation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width_cm integer DEFAULT 120 NOT NULL,
  height_cm integer DEFAULT 55 NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workstation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for workstation_types"
  ON workstation_types FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for workstation_types"
  ON workstation_types FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for workstation_types"
  ON workstation_types FOR UPDATE
  USING (true);

-- Create fixed_assets table
CREATE TABLE IF NOT EXISTS fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'other' NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for fixed_assets"
  ON fixed_assets FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for fixed_assets"
  ON fixed_assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for fixed_assets"
  ON fixed_assets FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access for fixed_assets"
  ON fixed_assets FOR DELETE
  USING (true);

-- Create workstation_assets junction table
CREATE TABLE IF NOT EXISTS workstation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workstation_id uuid REFERENCES workstations(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES fixed_assets(id) ON DELETE CASCADE,
  serial_number text,
  notes text,
  assigned_at timestamptz DEFAULT now()
);

ALTER TABLE workstation_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for workstation_assets"
  ON workstation_assets FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for workstation_assets"
  ON workstation_assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for workstation_assets"
  ON workstation_assets FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access for workstation_assets"
  ON workstation_assets FOR DELETE
  USING (true);

-- Add workstation_type_id to workstations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'workstation_type_id'
  ) THEN
    ALTER TABLE workstations ADD COLUMN workstation_type_id uuid REFERENCES workstation_types(id);
  END IF;
END $$;

-- Add floor to map_elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'floor'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN floor integer DEFAULT 0 NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_map_elements_floor ON map_elements(floor);
  END IF;
END $$;

-- Insert default workstation type
INSERT INTO workstation_types (name, width_cm, height_cm, description)
VALUES ('Isla', 120, 55, 'Workstation tipo isla estándar')
ON CONFLICT DO NOTHING;

-- Insert common fixed assets
INSERT INTO fixed_assets (name, category, description) VALUES
  ('Monitor', 'peripherals', 'Monitor de computadora'),
  ('Teléfono', 'peripherals', 'Teléfono de escritorio'),
  ('Adaptador de red', 'network', 'Adaptador Ethernet'),
  ('Teclado', 'peripherals', 'Teclado de computadora'),
  ('Mouse', 'peripherals', 'Mouse de computadora'),
  ('Docking Station', 'peripherals', 'Estación de acoplamiento'),
  ('Lámpara', 'furniture', 'Lámpara de escritorio'),
  ('Silla', 'furniture', 'Silla de oficina')
ON CONFLICT DO NOTHING;
