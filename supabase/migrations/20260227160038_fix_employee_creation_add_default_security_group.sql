/*
  # Fix Employee Creation - Add Default Security Group

  ## Summary
  Fixes the issue where employee creation fails because `owner_security_group_id` 
  is NOT NULL but no default value is provided. This migration adds a DEFAULT value
  pointing to the default security group and creates a trigger to automatically set
  the security group and user tracking fields.

  ## Changes Made
  1. Add DEFAULT value to `owner_security_group_id` column in employees table
  2. Create trigger to automatically set `owner_security_group_id` if not provided
  3. Create trigger to automatically set `created_by_user_id` on INSERT
  4. Create trigger to automatically set `updated_by_user_id` on UPDATE

  ## Security
  - Maintains existing RLS policies
  - Ensures all employees have a valid security group owner
  - Tracks user who created/updated each record
*/

-- Add DEFAULT value to owner_security_group_id in employees table
ALTER TABLE employees 
  ALTER COLUMN owner_security_group_id 
  SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create function to automatically set ownership fields for employees
CREATE OR REPLACE FUNCTION set_employee_ownership_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: set owner_security_group_id if not provided
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_security_group_id IS NULL THEN
      NEW.owner_security_group_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    
    -- Set created_by_user_id to current user
    IF NEW.created_by_user_id IS NULL THEN
      NEW.created_by_user_id := auth.uid();
    END IF;
  END IF;
  
  -- On UPDATE: set updated_by_user_id to current user
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by_user_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for employees
DROP TRIGGER IF EXISTS employees_ownership_fields ON employees;
CREATE TRIGGER employees_ownership_fields
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION set_employee_ownership_fields();

-- Apply the same fix to other tables for consistency

-- Sites
ALTER TABLE sites 
  ALTER COLUMN owner_security_group_id 
  SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE OR REPLACE FUNCTION set_site_ownership_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_security_group_id IS NULL THEN
      NEW.owner_security_group_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    IF NEW.created_by_user_id IS NULL THEN
      NEW.created_by_user_id := auth.uid();
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sites_ownership_fields ON sites;
CREATE TRIGGER sites_ownership_fields
  BEFORE INSERT OR UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION set_site_ownership_fields();

-- Workstations
ALTER TABLE workstations 
  ALTER COLUMN owner_security_group_id 
  SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE OR REPLACE FUNCTION set_workstation_ownership_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_security_group_id IS NULL THEN
      NEW.owner_security_group_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    IF NEW.created_by_user_id IS NULL THEN
      NEW.created_by_user_id := auth.uid();
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS workstations_ownership_fields ON workstations;
CREATE TRIGGER workstations_ownership_fields
  BEFORE INSERT OR UPDATE ON workstations
  FOR EACH ROW
  EXECUTE FUNCTION set_workstation_ownership_fields();

-- Workstation Types
ALTER TABLE workstation_types 
  ALTER COLUMN owner_security_group_id 
  SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE OR REPLACE FUNCTION set_workstation_type_ownership_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_security_group_id IS NULL THEN
      NEW.owner_security_group_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    IF NEW.created_by_user_id IS NULL THEN
      NEW.created_by_user_id := auth.uid();
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS workstation_types_ownership_fields ON workstation_types;
CREATE TRIGGER workstation_types_ownership_fields
  BEFORE INSERT OR UPDATE ON workstation_types
  FOR EACH ROW
  EXECUTE FUNCTION set_workstation_type_ownership_fields();

-- Map Elements
ALTER TABLE map_elements 
  ALTER COLUMN owner_security_group_id 
  SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE OR REPLACE FUNCTION set_map_element_ownership_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_security_group_id IS NULL THEN
      NEW.owner_security_group_id := '00000000-0000-0000-0000-000000000001';
    END IF;
    IF NEW.created_by_user_id IS NULL THEN
      NEW.created_by_user_id := auth.uid();
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS map_elements_ownership_fields ON map_elements;
CREATE TRIGGER map_elements_ownership_fields
  BEFORE INSERT OR UPDATE ON map_elements
  FOR EACH ROW
  EXECUTE FUNCTION set_map_element_ownership_fields();
