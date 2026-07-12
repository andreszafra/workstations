/*
  # Fix Database Security Issues

  This migration addresses multiple security and performance issues:

  ## 1. Performance Improvements
    - Add indexes for unindexed foreign keys on:
      - employee_history (site_id, workstation_id)
      - map_elements (site_id)
      - workstation_assets (asset_id, workstation_id)
      - workstations (workstation_type_id)
    - Remove unused indexes that are not being utilized

  ## 2. Security Improvements
    - Consolidate duplicate RLS policies (remove redundant policies)
    - Fix function search paths to be immutable
    - Keep public access policies as this is intended for public use

  ## Notes
    - RLS policies remain permissive as this application is designed for public access
    - Auth DB Connection Strategy must be configured in Supabase dashboard
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Index for employee_history.site_id
CREATE INDEX IF NOT EXISTS idx_employee_history_site_id 
ON employee_history(site_id);

-- Index for employee_history.workstation_id
CREATE INDEX IF NOT EXISTS idx_employee_history_workstation_id 
ON employee_history(workstation_id);

-- Index for map_elements.site_id
CREATE INDEX IF NOT EXISTS idx_map_elements_site_id 
ON map_elements(site_id);

-- Index for workstation_assets.asset_id
CREATE INDEX IF NOT EXISTS idx_workstation_assets_asset_id 
ON workstation_assets(asset_id);

-- Index for workstation_assets.workstation_id
CREATE INDEX IF NOT EXISTS idx_workstation_assets_workstation_id 
ON workstation_assets(workstation_id);

-- Index for workstations.workstation_type_id
CREATE INDEX IF NOT EXISTS idx_workstations_workstation_type_id 
ON workstations(workstation_type_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_workstations_assigned_to;
DROP INDEX IF EXISTS idx_workstations_status;
DROP INDEX IF EXISTS idx_workstations_floor;
DROP INDEX IF EXISTS idx_assignment_history_employee_id;
DROP INDEX IF EXISTS idx_employee_history_id_number;
DROP INDEX IF EXISTS idx_employee_history_assigned_at;
DROP INDEX IF EXISTS idx_map_elements_floor;

-- =====================================================
-- 3. CONSOLIDATE DUPLICATE RLS POLICIES
-- =====================================================

-- Drop duplicate policies for employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

-- Drop duplicate policies for maintenance_logs
DROP POLICY IF EXISTS "Authenticated users can view maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Authenticated users can update maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Authenticated users can delete maintenance logs" ON maintenance_logs;

-- Drop duplicate policies for sites
DROP POLICY IF EXISTS "Authenticated users can view sites" ON sites;
DROP POLICY IF EXISTS "Authenticated users can insert sites" ON sites;
DROP POLICY IF EXISTS "Authenticated users can update sites" ON sites;
DROP POLICY IF EXISTS "Authenticated users can delete sites" ON sites;

-- Drop duplicate policies for workstations
DROP POLICY IF EXISTS "Authenticated users can view workstations" ON workstations;
DROP POLICY IF EXISTS "Authenticated users can insert workstations" ON workstations;
DROP POLICY IF EXISTS "Authenticated users can update workstations" ON workstations;
DROP POLICY IF EXISTS "Authenticated users can delete workstations" ON workstations;

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Recreate track_employee_assignment with immutable search path
CREATE OR REPLACE FUNCTION public.track_employee_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR 
     (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO assignment_history (workstation_id, employee_id, assigned_at)
    VALUES (NEW.id, NEW.assigned_to, NOW());
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate is_manual_status with immutable search path
CREATE OR REPLACE FUNCTION public.is_manual_status(status_value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN status_value IN ('maintenance', 'pending', 'unavailable', 'out_of_service');
END;
$$;

-- Recreate update_workstation_status with immutable search path
CREATE OR REPLACE FUNCTION public.update_workstation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_manual_status(NEW.status) THEN
    IF NEW.assigned_to IS NOT NULL THEN
      NEW.status := 'assigned';
    ELSE
      NEW.status := 'available';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate update_workstations_on_employee_status_change with immutable search path
CREATE OR REPLACE FUNCTION public.update_workstations_on_employee_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'inactive' AND OLD.status != 'inactive' THEN
    UPDATE workstations
    SET assigned_to = NULL
    WHERE assigned_to = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;