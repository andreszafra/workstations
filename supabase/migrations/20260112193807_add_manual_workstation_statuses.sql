/*
  # Add Manual Workstation Status Handling

  1. Changes
    - Add CHECK constraint to allow new manual status values
    - Modify automatic status update trigger to preserve manual statuses
    - Add helper function to check if status is manual
  
  2. New Manual Statuses
    - `pending`: Workstation is being prepared/configured
    - `unavailable`: Workstation is temporarily unavailable
    - `out_of_service`: Workstation is out of service
  
  3. Automatic Statuses (managed by triggers)
    - `available`: No employee assigned
    - `assigned`: Employee assigned and active
    - `maintenance`: Employee assigned but inactive
  
  4. Business Rules
    - Manual statuses cannot have employees assigned
    - Trigger will not override manual statuses
    - Only automatic statuses can be changed by the trigger
  
  5. Security
    - Maintains existing RLS policies
    - Adds constraint to ensure valid status values
*/

-- Add CHECK constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workstations_status_check'
  ) THEN
    ALTER TABLE workstations
    ADD CONSTRAINT workstations_status_check 
    CHECK (status IN ('available', 'assigned', 'maintenance', 'pending', 'unavailable', 'out_of_service'));
  END IF;
END $$;

-- Create helper function to check if status is manual
CREATE OR REPLACE FUNCTION is_manual_status(status_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN status_value IN ('pending', 'unavailable', 'out_of_service');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the automatic status update function to respect manual statuses
CREATE OR REPLACE FUNCTION update_workstation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If the status is being manually set, preserve it
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- If user is explicitly changing status, keep it
    RETURN NEW;
  END IF;

  -- Don't modify manual statuses automatically
  IF NEW.status IS NOT NULL AND is_manual_status(NEW.status) THEN
    -- If trying to assign an employee to a manual status workstation, prevent it
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      RAISE EXCEPTION 'Cannot assign employee to workstation with status: %. Please change status first.', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Apply automatic status logic only for non-manual statuses
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

-- Update the employee status change function to respect manual statuses
CREATE OR REPLACE FUNCTION update_workstations_on_employee_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Update only workstations that don't have manual statuses
    IF NEW.status = 'active' THEN
      UPDATE workstations
      SET status = 'assigned'
      WHERE assigned_to = NEW.id
        AND NOT is_manual_status(status);
    ELSE
      UPDATE workstations
      SET status = 'maintenance'
      WHERE assigned_to = NEW.id
        AND NOT is_manual_status(status);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the status system
COMMENT ON COLUMN workstations.status IS 'Workstation status: available/assigned/maintenance (automatic) or pending/unavailable/out_of_service (manual). Manual statuses prevent automatic updates and employee assignments.';