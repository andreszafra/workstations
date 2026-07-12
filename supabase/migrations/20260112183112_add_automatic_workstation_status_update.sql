/*
  # Add automatic workstation status updates

  1. Changes
    - Create function to automatically update workstation status based on employee assignment
    - Add trigger to update status when workstation assignment changes
    - Add trigger to update status when employee status changes
  
  2. Status Logic
    - If workstation has assigned employee and employee is active → status = 'assigned'
    - If workstation has assigned employee but employee is inactive → status = 'maintenance'
    - If workstation has no assigned employee → status = 'available'
  
  3. Security
    - Function is secure and only updates the status field
    - Triggers run automatically on assignment changes
*/

-- Function to update workstation status based on employee assignment
CREATE OR REPLACE FUNCTION update_workstation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If assigned_to is null, set status to available
  IF NEW.assigned_to IS NULL THEN
    NEW.status := 'available';
  ELSE
    -- Check if assigned employee is active
    DECLARE
      employee_status TEXT;
    BEGIN
      SELECT status INTO employee_status
      FROM employees
      WHERE id = NEW.assigned_to;
      
      -- If employee is active, status is assigned
      -- If employee is inactive, status is maintenance
      IF employee_status = 'active' THEN
        NEW.status := 'assigned';
      ELSE
        NEW.status := 'maintenance';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workstation status when assigned_to changes
DROP TRIGGER IF EXISTS trigger_update_workstation_status ON workstations;
CREATE TRIGGER trigger_update_workstation_status
  BEFORE INSERT OR UPDATE OF assigned_to
  ON workstations
  FOR EACH ROW
  EXECUTE FUNCTION update_workstation_status();

-- Function to update all workstations when an employee's status changes
CREATE OR REPLACE FUNCTION update_workstations_on_employee_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Update all workstations assigned to this employee
    IF NEW.status = 'active' THEN
      UPDATE workstations
      SET status = 'assigned'
      WHERE assigned_to = NEW.id;
    ELSE
      UPDATE workstations
      SET status = 'maintenance'
      WHERE assigned_to = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workstations when employee status changes
DROP TRIGGER IF EXISTS trigger_update_workstations_on_employee_status ON employees;
CREATE TRIGGER trigger_update_workstations_on_employee_status
  AFTER UPDATE OF status
  ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_workstations_on_employee_status_change();