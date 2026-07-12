/*
  # Fix Security and Performance Issues

  ## Summary
  Comprehensive fix for security vulnerabilities and performance issues identified in database audit.

  ## 1. Add Missing Indexes for Foreign Keys
  - employee_history: site_id, workstation_id
  - employees: created_by_user_id, owner_security_group_id, updated_by_user_id
  - map_elements: created_by_user_id, owner_security_group_id, site_id, updated_by_user_id
  - sites: created_by_user_id, owner_security_group_id, updated_by_user_id
  - workstation_assets: asset_id
  - workstation_types: created_by_user_id, owner_security_group_id, updated_by_user_id
  - workstations: created_by_user_id, owner_security_group_id, updated_by_user_id, workstation_type_id

  ## 2. Enable RLS on All Public Tables
  - maintenance_logs, employees, sites, assignment_history, fixed_assets
  - workstation_assets, workstation_types, employee_history, workstations
  - system_config, map_elements

  ## 3. Optimize RLS Policies
  - Replace auth.uid() with (SELECT auth.uid()) for better performance
  - Fix policies on user_preferences and user_password_requirements

  ## 4. Fix Function Search Paths
  - Set search_path for all functions to prevent security issues

  ## 5. Security
  - All tables now have RLS enabled
  - All foreign keys are indexed for performance
  - RLS policies optimized for performance
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- ============================================================================

-- employee_history indexes
CREATE INDEX IF NOT EXISTS idx_employee_history_site_id ON employee_history(site_id);
CREATE INDEX IF NOT EXISTS idx_employee_history_workstation_id ON employee_history(workstation_id);

-- employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_created_by_user_id ON employees(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_owner_security_group_id ON employees(owner_security_group_id);
CREATE INDEX IF NOT EXISTS idx_employees_updated_by_user_id ON employees(updated_by_user_id);

-- map_elements indexes
CREATE INDEX IF NOT EXISTS idx_map_elements_created_by_user_id ON map_elements(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_owner_security_group_id ON map_elements(owner_security_group_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_site_id ON map_elements(site_id);
CREATE INDEX IF NOT EXISTS idx_map_elements_updated_by_user_id ON map_elements(updated_by_user_id);

-- sites indexes
CREATE INDEX IF NOT EXISTS idx_sites_created_by_user_id ON sites(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_sites_owner_security_group_id ON sites(owner_security_group_id);
CREATE INDEX IF NOT EXISTS idx_sites_updated_by_user_id ON sites(updated_by_user_id);

-- workstation_assets indexes
CREATE INDEX IF NOT EXISTS idx_workstation_assets_asset_id ON workstation_assets(asset_id);

-- workstation_types indexes
CREATE INDEX IF NOT EXISTS idx_workstation_types_created_by_user_id ON workstation_types(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workstation_types_owner_security_group_id ON workstation_types(owner_security_group_id);
CREATE INDEX IF NOT EXISTS idx_workstation_types_updated_by_user_id ON workstation_types(updated_by_user_id);

-- workstations indexes
CREATE INDEX IF NOT EXISTS idx_workstations_created_by_user_id ON workstations(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workstations_owner_security_group_id ON workstations(owner_security_group_id);
CREATE INDEX IF NOT EXISTS idx_workstations_updated_by_user_id ON workstations(updated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workstations_workstation_type_id ON workstations(workstation_type_id);

-- ============================================================================
-- 2. ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================================================

ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstation_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - user_preferences
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can create own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - user_password_requirements
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own password requirements" ON user_password_requirements;
DROP POLICY IF EXISTS "Users can update own password requirements" ON user_password_requirements;

CREATE POLICY "Users can view own password requirements"
  ON user_password_requirements FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own password requirements"
  ON user_password_requirements FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. FIX FUNCTION SEARCH PATHS
-- ============================================================================

ALTER FUNCTION update_user_password_requirements_updated_at() SET search_path = '';
ALTER FUNCTION update_system_config_updated_at() SET search_path = '';
ALTER FUNCTION get_employee_by_user_id(uuid) SET search_path = '';
ALTER FUNCTION employee_has_user(uuid) SET search_path = '';
ALTER FUNCTION update_companies_updated_at() SET search_path = '';
ALTER FUNCTION update_user_preferences_updated_at() SET search_path = '';
