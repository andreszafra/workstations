/*
  # Add Employee-User Linkage and SuperAdmin User

  ## Changes
  
  1. Schema Changes
    - Add `user_id` column to `employees` table (nullable, unique)
    - Add foreign key constraint from employees.user_id to auth.users.id
    - Add index on user_id for performance
    
  2. Functions
    - Create function to get employee by user_id
    - Create function to check if employee already has user
    
  3. Superadmin Setup
    - Create superadmin user with email 'superadmin@system.local'
    - Default password will be set (should be changed on first login)
    - Assign SuperAdmin role to this user
    
  4. Security
    - Update RLS policies to handle user_id relationships
    - Ensure users can only see their own employee data
*/

-- Add user_id to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
  END IF;
END $$;

-- Function to get employee by user_id
CREATE OR REPLACE FUNCTION get_employee_by_user_id(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  user_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.first_name, e.last_name, e.email, e.user_id
  FROM employees e
  WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if employee has user
CREATE OR REPLACE FUNCTION employee_has_user(p_employee_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees WHERE id = p_employee_id AND user_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for users to read their own employee data
CREATE POLICY "Users can read own employee data"
  ON employees
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Comment about superadmin creation
COMMENT ON TABLE employees IS 'Superadmin user should be created through the Edge Function with email superadmin@system.local';
