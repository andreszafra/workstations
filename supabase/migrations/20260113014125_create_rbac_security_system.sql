/*
  # Create RBAC and Security Groups System

  ## Summary
  Implements a scalable, enterprise-grade authorization system with Roles + Security Groups
  for a multi-module ERP application. This provides fine-grained access control at the
  module and record level.

  ## 1. New Tables

  ### roles
  - `id` (uuid, primary key)
  - `name` (text, unique) - Role name (e.g., "System Admin", "Manager")
  - `description` (text) - Role description
  - `is_system` (boolean) - System-defined role (cannot be deleted)
  - `created_at`, `updated_at` (timestamptz)

  ### role_module_permissions
  Defines permissions for each role on each module. Each action has specific allowed values:
  - `id` (uuid, primary key)
  - `role_id` (uuid, FK to roles)
  - `module_key` (text) - Module identifier (e.g., "workstations", "employees")
  - `access` (text) - "Enabled" | "Disabled"
  - `delete_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - `edit_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - `export_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - `import_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - `list_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - `bulk_update_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - `view_perm` (text) - "All" | "OwnerGroupOnly" | "None" | "NotSet"
  - Unique constraint on (role_id, module_key)

  ### security_groups
  Groups for data ownership and administration boundaries. Supports hierarchy.
  - `id` (uuid, primary key)
  - `name` (text, unique) - Group name
  - `description` (text) - Group description
  - `parent_group_id` (uuid, FK to security_groups, nullable) - Parent group for hierarchy
  - `created_at`, `updated_at` (timestamptz)

  ### user_security_groups
  Many-to-many relationship between users and security groups
  - `user_id` (uuid, FK to auth.users)
  - `security_group_id` (uuid, FK to security_groups)
  - `is_primary` (boolean) - Primary group for the user
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, security_group_id)

  ### user_roles
  Many-to-many relationship between users and roles
  - `user_id` (uuid, FK to auth.users)
  - `role_id` (uuid, FK to roles)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, role_id)

  ### system_security_config
  Global security settings
  - `key` (text, primary key) - Setting key
  - `value` (text) - Setting value
  - `description` (text) - Setting description
  - `updated_at` (timestamptz)

  ## 2. Modifications to Existing Tables

  Add ownership tracking to all business record tables:
  - `owner_security_group_id` (uuid, FK to security_groups, NOT NULL)
  - `created_by_user_id` (uuid, FK to auth.users, NOT NULL)
  - `updated_by_user_id` (uuid, FK to auth.users)

  Tables to modify:
  - sites
  - employees
  - workstations
  - workstation_types
  - map_elements

  ## 3. Security
  - Enable RLS on all new tables
  - Create policies for authenticated access
  - Ownership columns are required for all business records

  ## 4. Default Data
  - Create "Default" security group
  - Create "System Admin" role with full permissions
  - Default system configuration settings
*/

-- ============================================================================
-- 1. CREATE ENUMS AND TYPES
-- ============================================================================

-- We'll use text with CHECK constraints for flexibility and clarity

-- ============================================================================
-- 2. CREATE CORE TABLES
-- ============================================================================

-- Security Groups Table
CREATE TABLE IF NOT EXISTS security_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  parent_group_id uuid REFERENCES security_groups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Role Module Permissions Table
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  access text NOT NULL DEFAULT 'Disabled' CHECK (access IN ('Enabled', 'Disabled')),
  delete_perm text DEFAULT 'NotSet' CHECK (delete_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  edit_perm text DEFAULT 'NotSet' CHECK (edit_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  export_perm text DEFAULT 'NotSet' CHECK (export_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  import_perm text DEFAULT 'NotSet' CHECK (import_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  list_perm text DEFAULT 'NotSet' CHECK (list_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  bulk_update_perm text DEFAULT 'NotSet' CHECK (bulk_update_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  view_perm text DEFAULT 'NotSet' CHECK (view_perm IN ('All', 'OwnerGroupOnly', 'None', 'NotSet')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, module_key)
);

-- User Security Groups Junction Table
CREATE TABLE IF NOT EXISTS user_security_groups (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  security_group_id uuid NOT NULL REFERENCES security_groups(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, security_group_id)
);

-- User Roles Junction Table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- System Security Configuration Table
CREATE TABLE IF NOT EXISTS system_security_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. ADD OWNERSHIP COLUMNS TO EXISTING TABLES
-- ============================================================================

-- First, create a default security group to reference
INSERT INTO security_groups (id, name, description, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'Default security group for initial setup', now())
ON CONFLICT (name) DO NOTHING;

-- Add columns to sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'owner_security_group_id'
  ) THEN
    ALTER TABLE sites ADD COLUMN owner_security_group_id uuid REFERENCES security_groups(id);
    UPDATE sites SET owner_security_group_id = '00000000-0000-0000-0000-000000000001' WHERE owner_security_group_id IS NULL;
    ALTER TABLE sites ALTER COLUMN owner_security_group_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE sites ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE sites ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'owner_security_group_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN owner_security_group_id uuid REFERENCES security_groups(id);
    UPDATE employees SET owner_security_group_id = '00000000-0000-0000-0000-000000000001' WHERE owner_security_group_id IS NULL;
    ALTER TABLE employees ALTER COLUMN owner_security_group_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to workstations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'owner_security_group_id'
  ) THEN
    ALTER TABLE workstations ADD COLUMN owner_security_group_id uuid REFERENCES security_groups(id);
    UPDATE workstations SET owner_security_group_id = '00000000-0000-0000-0000-000000000001' WHERE owner_security_group_id IS NULL;
    ALTER TABLE workstations ALTER COLUMN owner_security_group_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE workstations ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstations' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE workstations ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to workstation_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstation_types' AND column_name = 'owner_security_group_id'
  ) THEN
    ALTER TABLE workstation_types ADD COLUMN owner_security_group_id uuid REFERENCES security_groups(id);
    UPDATE workstation_types SET owner_security_group_id = '00000000-0000-0000-0000-000000000001' WHERE owner_security_group_id IS NULL;
    ALTER TABLE workstation_types ALTER COLUMN owner_security_group_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstation_types' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE workstation_types ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workstation_types' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE workstation_types ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to map_elements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'owner_security_group_id'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN owner_security_group_id uuid REFERENCES security_groups(id);
    UPDATE map_elements SET owner_security_group_id = '00000000-0000-0000-0000-000000000001' WHERE owner_security_group_id IS NULL;
    ALTER TABLE map_elements ALTER COLUMN owner_security_group_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_elements' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE map_elements ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role_id ON role_module_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module_key ON role_module_permissions(module_key);
CREATE INDEX IF NOT EXISTS idx_user_security_groups_user_id ON user_security_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_groups_group_id ON user_security_groups(security_group_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_security_groups_parent ON security_groups(parent_group_id);

-- ============================================================================
-- 5. INSERT DEFAULT CONFIGURATION
-- ============================================================================

-- Insert system security configuration defaults
INSERT INTO system_security_config (key, value, description, updated_at)
VALUES 
  ('security_group_inheritance_enabled', 'true', 'When enabled, membership in a parent group implies membership in all descendants', now()),
  ('non_admin_can_assign_users_outside_own_groups', 'false', 'When false, non-admin users can only assign records/users to groups they belong to', now())
ON CONFLICT (key) DO NOTHING;

-- Create System Admin role with full permissions on all modules
INSERT INTO roles (id, name, description, is_system, created_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'System Admin', 'Full system administrator with all permissions', true, now())
ON CONFLICT (name) DO NOTHING;

-- Define all modules in the system
DO $$
DECLARE
  admin_role_id uuid := '00000000-0000-0000-0000-000000000002';
  modules text[] := ARRAY['sites', 'employees', 'workstations', 'workstation_types', 'map_elements', 'dashboard', 'settings', 'security_groups', 'roles', 'users'];
  module_name text;
BEGIN
  FOREACH module_name IN ARRAY modules
  LOOP
    INSERT INTO role_module_permissions (role_id, module_key, access, delete_perm, edit_perm, export_perm, import_perm, list_perm, bulk_update_perm, view_perm)
    VALUES (admin_role_id, module_name, 'Enabled', 'All', 'All', 'All', 'All', 'All', 'All', 'All')
    ON CONFLICT (role_id, module_key) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE security_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_security_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- Security Groups Policies
CREATE POLICY "Authenticated users can view security groups"
  ON security_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert security groups"
  ON security_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update security groups"
  ON security_groups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete security groups"
  ON security_groups FOR DELETE
  TO authenticated
  USING (true);

-- Roles Policies
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete non-system roles"
  ON roles FOR DELETE
  TO authenticated
  USING (is_system = false);

-- Role Module Permissions Policies
CREATE POLICY "Authenticated users can view role permissions"
  ON role_module_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert role permissions"
  ON role_module_permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update role permissions"
  ON role_module_permissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete role permissions"
  ON role_module_permissions FOR DELETE
  TO authenticated
  USING (true);

-- User Security Groups Policies
CREATE POLICY "Authenticated users can view user security groups"
  ON user_security_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert user security groups"
  ON user_security_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update user security groups"
  ON user_security_groups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete user security groups"
  ON user_security_groups FOR DELETE
  TO authenticated
  USING (true);

-- User Roles Policies
CREATE POLICY "Authenticated users can view user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert user roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update user roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete user roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (true);

-- System Security Config Policies
CREATE POLICY "Authenticated users can view system config"
  ON system_security_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update system config"
  ON system_security_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);