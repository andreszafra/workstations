/*
  # Fix assignment history trigger to include employee_name

  1. Problem
    - The trigger `track_employee_assignment` inserts into `assignment_history` without `employee_name`
    - The `employee_name` column is NOT NULL, causing constraint violations
  
  2. Solution
    - Update the function to fetch and include employee name when creating history records
    - Properly handle assignment and unassignment tracking
  
  3. Changes
    - Recreate `track_employee_assignment` function with proper employee_name lookup
*/

-- Drop and recreate the function with proper employee_name handling
CREATE OR REPLACE FUNCTION track_employee_assignment()
RETURNS TRIGGER AS $$
DECLARE
  emp_name TEXT;
BEGIN
  -- When an employee assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR 
     (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Close previous assignment if exists (on UPDATE only)
    IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      UPDATE assignment_history 
      SET unassigned_at = NOW() 
      WHERE workstation_id = OLD.id 
        AND unassigned_at IS NULL;
    END IF;
    
    -- Create new assignment record if employee is assigned
    IF NEW.assigned_to IS NOT NULL THEN
      -- Get employee name
      SELECT name INTO emp_name
      FROM employees
      WHERE id = NEW.assigned_to;
      
      -- Insert new assignment history record
      INSERT INTO assignment_history (
        workstation_id, 
        employee_id, 
        employee_name,
        assigned_at
      )
      VALUES (
        NEW.id, 
        NEW.assigned_to,
        emp_name,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';
