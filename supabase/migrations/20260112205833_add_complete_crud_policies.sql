/*
  # Agregar Políticas CRUD Completas

  1. Cambios
    - Se agregan políticas de INSERT, UPDATE, DELETE faltantes para todas las tablas
    - Esto permite operaciones completas de creación, lectura, actualización y eliminación
    - Las políticas son consistentes con el diseño del sistema (acceso público sin autenticación)

  2. Tablas actualizadas
    - `workstations`: agregar INSERT, DELETE
    - `employees`: agregar INSERT, UPDATE, DELETE
    - `sites`: agregar INSERT, UPDATE, DELETE
    - `workstation_types`: agregar INSERT, UPDATE, DELETE, SELECT
    - `maintenance_logs`: agregar INSERT, UPDATE, DELETE
    - `map_elements`: agregar INSERT, UPDATE, DELETE
    - `fixed_assets`: agregar INSERT, UPDATE, DELETE, SELECT
    - `workstation_assets`: agregar INSERT, UPDATE, DELETE, SELECT
    - `employee_history`: agregar INSERT, UPDATE, DELETE, SELECT
    - `system_config`: agregar INSERT, UPDATE, DELETE, SELECT
    - `assignment_history`: agregar DELETE (ya tiene INSERT, UPDATE, SELECT)

  3. Seguridad
    - Todas las políticas permiten acceso público (anon, authenticated)
    - Consistente con el diseño sin autenticación del sistema
    - RLS permanece deshabilitado pero las políticas están disponibles por si se habilita en el futuro
*/

-- WORKSTATIONS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstations' AND policyname = 'Allow public to insert workstations'
  ) THEN
    CREATE POLICY "Allow public to insert workstations"
      ON workstations FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstations' AND policyname = 'Allow public to delete workstations'
  ) THEN
    CREATE POLICY "Allow public to delete workstations"
      ON workstations FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- EMPLOYEES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Allow public to insert employees'
  ) THEN
    CREATE POLICY "Allow public to insert employees"
      ON employees FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Allow public to update employees'
  ) THEN
    CREATE POLICY "Allow public to update employees"
      ON employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Allow public to delete employees'
  ) THEN
    CREATE POLICY "Allow public to delete employees"
      ON employees FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- SITES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sites' AND policyname = 'Allow public to insert sites'
  ) THEN
    CREATE POLICY "Allow public to insert sites"
      ON sites FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sites' AND policyname = 'Allow public to update sites'
  ) THEN
    CREATE POLICY "Allow public to update sites"
      ON sites FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sites' AND policyname = 'Allow public to delete sites'
  ) THEN
    CREATE POLICY "Allow public to delete sites"
      ON sites FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- WORKSTATION_TYPES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_types' AND policyname = 'Allow public to view workstation types'
  ) THEN
    CREATE POLICY "Allow public to view workstation types"
      ON workstation_types FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_types' AND policyname = 'Allow public to insert workstation types'
  ) THEN
    CREATE POLICY "Allow public to insert workstation types"
      ON workstation_types FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_types' AND policyname = 'Allow public to update workstation types'
  ) THEN
    CREATE POLICY "Allow public to update workstation types"
      ON workstation_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_types' AND policyname = 'Allow public to delete workstation types'
  ) THEN
    CREATE POLICY "Allow public to delete workstation types"
      ON workstation_types FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- MAINTENANCE_LOGS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_logs' AND policyname = 'Allow public to insert maintenance logs'
  ) THEN
    CREATE POLICY "Allow public to insert maintenance logs"
      ON maintenance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_logs' AND policyname = 'Allow public to update maintenance logs'
  ) THEN
    CREATE POLICY "Allow public to update maintenance logs"
      ON maintenance_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_logs' AND policyname = 'Allow public to delete maintenance logs'
  ) THEN
    CREATE POLICY "Allow public to delete maintenance logs"
      ON maintenance_logs FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- MAP_ELEMENTS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'map_elements' AND policyname = 'Allow public to insert map elements'
  ) THEN
    CREATE POLICY "Allow public to insert map elements"
      ON map_elements FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'map_elements' AND policyname = 'Allow public to update map elements'
  ) THEN
    CREATE POLICY "Allow public to update map elements"
      ON map_elements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'map_elements' AND policyname = 'Allow public to delete map elements'
  ) THEN
    CREATE POLICY "Allow public to delete map elements"
      ON map_elements FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- ASSIGNMENT_HISTORY
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignment_history' AND policyname = 'Allow public to delete assignment history'
  ) THEN
    CREATE POLICY "Allow public to delete assignment history"
      ON assignment_history FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- FIXED_ASSETS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fixed_assets' AND policyname = 'Allow public to view fixed assets'
  ) THEN
    CREATE POLICY "Allow public to view fixed assets"
      ON fixed_assets FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fixed_assets' AND policyname = 'Allow public to insert fixed assets'
  ) THEN
    CREATE POLICY "Allow public to insert fixed assets"
      ON fixed_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fixed_assets' AND policyname = 'Allow public to update fixed assets'
  ) THEN
    CREATE POLICY "Allow public to update fixed assets"
      ON fixed_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fixed_assets' AND policyname = 'Allow public to delete fixed assets'
  ) THEN
    CREATE POLICY "Allow public to delete fixed assets"
      ON fixed_assets FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- WORKSTATION_ASSETS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_assets' AND policyname = 'Allow public to view workstation assets'
  ) THEN
    CREATE POLICY "Allow public to view workstation assets"
      ON workstation_assets FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_assets' AND policyname = 'Allow public to insert workstation assets'
  ) THEN
    CREATE POLICY "Allow public to insert workstation assets"
      ON workstation_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_assets' AND policyname = 'Allow public to update workstation assets'
  ) THEN
    CREATE POLICY "Allow public to update workstation assets"
      ON workstation_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstation_assets' AND policyname = 'Allow public to delete workstation assets'
  ) THEN
    CREATE POLICY "Allow public to delete workstation assets"
      ON workstation_assets FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- EMPLOYEE_HISTORY
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_history' AND policyname = 'Allow public to view employee history'
  ) THEN
    CREATE POLICY "Allow public to view employee history"
      ON employee_history FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_history' AND policyname = 'Allow public to insert employee history'
  ) THEN
    CREATE POLICY "Allow public to insert employee history"
      ON employee_history FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_history' AND policyname = 'Allow public to update employee history'
  ) THEN
    CREATE POLICY "Allow public to update employee history"
      ON employee_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_history' AND policyname = 'Allow public to delete employee history'
  ) THEN
    CREATE POLICY "Allow public to delete employee history"
      ON employee_history FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- SYSTEM_CONFIG
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_config' AND policyname = 'Allow public to view system config'
  ) THEN
    CREATE POLICY "Allow public to view system config"
      ON system_config FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_config' AND policyname = 'Allow public to insert system config'
  ) THEN
    CREATE POLICY "Allow public to insert system config"
      ON system_config FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_config' AND policyname = 'Allow public to update system config'
  ) THEN
    CREATE POLICY "Allow public to update system config"
      ON system_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_config' AND policyname = 'Allow public to delete system config'
  ) THEN
    CREATE POLICY "Allow public to delete system config"
      ON system_config FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;
