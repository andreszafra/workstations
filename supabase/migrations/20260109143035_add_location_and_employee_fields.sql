/*
  # Add Location and Employee Identity Fields

  1. Changes to `sites` Table
    - Add `address` (text) - Full street address of the site
    - Add `city` (text) - City where the site is located
    - Add `department` (text) - Department/State/Province
    - Add `country` (text) - Country where the site is located

  2. Changes to `employees` Table
    - Add `city` (text) - City where the employee is located
    - Add `company` (text) - Company/Organization name
    - Add `id_type` (text) - Type of ID (CC, PSP, CE, Otro)
    - Add `id_number` (text) - ID number (unique for tracking history)

  3. New Table `employee_history`
    - Tracks historical assignments and locations based on ID number
    - `id` (uuid, primary key)
    - `id_number` (text) - Employee ID number for tracking
    - `employee_name` (text) - Name at time of record
    - `workstation_id` (uuid) - Reference to workstation
    - `site_id` (uuid) - Reference to site
    - `city` (text) - City at time of assignment
    - `assigned_at` (timestamptz) - When assignment started
    - `unassigned_at` (timestamptz) - When assignment ended (null if current)

  4. Security
    - Enable RLS on employee_history table
    - Add policies for public access
*/

-- Add fields to sites table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'address'
  ) THEN
    ALTER TABLE sites ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'city'
  ) THEN
    ALTER TABLE sites ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'department'
  ) THEN
    ALTER TABLE sites ADD COLUMN department text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'country'
  ) THEN
    ALTER TABLE sites ADD COLUMN country text;
  END IF;
END $$;

-- Add fields to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'city'
  ) THEN
    ALTER TABLE employees ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'company'
  ) THEN
    ALTER TABLE employees ADD COLUMN company text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'id_type'
  ) THEN
    ALTER TABLE employees ADD COLUMN id_type text DEFAULT 'CC';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'id_number'
  ) THEN
    ALTER TABLE employees ADD COLUMN id_number text;
  END IF;
END $$;

-- Create index on id_number for efficient lookups
CREATE INDEX IF NOT EXISTS idx_employees_id_number ON employees(id_number);

-- Create employee_history table
CREATE TABLE IF NOT EXISTS employee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_number text NOT NULL,
  employee_name text NOT NULL,
  workstation_id uuid REFERENCES workstations(id) ON DELETE SET NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  city text,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  unassigned_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for employee_history"
  ON employee_history FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for employee_history"
  ON employee_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for employee_history"
  ON employee_history FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access for employee_history"
  ON employee_history FOR DELETE
  USING (true);

-- Create indexes for efficient history queries
CREATE INDEX IF NOT EXISTS idx_employee_history_id_number ON employee_history(id_number);
CREATE INDEX IF NOT EXISTS idx_employee_history_assigned_at ON employee_history(assigned_at DESC);

-- Create function to automatically track employee history when workstation assignment changes
CREATE OR REPLACE FUNCTION track_employee_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When an employee is assigned to a workstation
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR 
     (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Close previous assignment if exists
    IF OLD.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      UPDATE employee_history 
      SET unassigned_at = now() 
      WHERE workstation_id = OLD.id 
        AND unassigned_at IS NULL;
    END IF;
    
    -- Create new history record if employee is assigned
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO employee_history (
        id_number, 
        employee_name, 
        workstation_id, 
        site_id, 
        city,
        assigned_at
      )
      SELECT 
        COALESCE(e.id_number, e.id::text),
        e.name,
        NEW.id,
        NEW.site_id,
        e.city,
        now()
      FROM employees e
      WHERE e.id = NEW.assigned_to;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workstation assignment tracking
DROP TRIGGER IF EXISTS trigger_track_employee_assignment ON workstations;
CREATE TRIGGER trigger_track_employee_assignment
  AFTER INSERT OR UPDATE ON workstations
  FOR EACH ROW
  EXECUTE FUNCTION track_employee_assignment();
