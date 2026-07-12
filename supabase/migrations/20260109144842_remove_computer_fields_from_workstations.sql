/*
  # Remove Computer-Related Fields from Workstations

  1. Changes to `workstations` Table
    - Remove `type` field (replaced by workstation_type_id)
    - Remove computer-specific fields:
      - `manufacturer`
      - `model`
      - `cpu`
      - `ram`
      - `storage`
      - `os`
      - `serial_number`
      - `purchase_date`
      - `warranty_expiry`
    
  2. Rationale
    - These fields are replaced by:
      - workstation_type_id: References the workstation_types table
      - workstation_assets: Links to fixed_assets for tracking specific equipment
    - This separation allows better tracking of physical workstations vs their equipment
*/

-- Remove old type field (replaced by workstation_type_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'type'
  ) THEN
    ALTER TABLE workstations DROP COLUMN type;
  END IF;
END $$;

-- Remove computer-specific fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'manufacturer'
  ) THEN
    ALTER TABLE workstations DROP COLUMN manufacturer;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'model'
  ) THEN
    ALTER TABLE workstations DROP COLUMN model;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'cpu'
  ) THEN
    ALTER TABLE workstations DROP COLUMN cpu;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'ram'
  ) THEN
    ALTER TABLE workstations DROP COLUMN ram;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'storage'
  ) THEN
    ALTER TABLE workstations DROP COLUMN storage;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'os'
  ) THEN
    ALTER TABLE workstations DROP COLUMN os;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE workstations DROP COLUMN serial_number;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE workstations DROP COLUMN purchase_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'warranty_expiry'
  ) THEN
    ALTER TABLE workstations DROP COLUMN warranty_expiry;
  END IF;
END $$;
