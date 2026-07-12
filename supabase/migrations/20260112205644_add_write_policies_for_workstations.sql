/*
  # Agregar Políticas de Escritura

  1. Cambios
    - Se agregan políticas de UPDATE para la tabla `workstations`
    - Se agregan políticas de INSERT y UPDATE para la tabla `assignment_history`
    - Esto permite que usuarios autenticados y anónimos puedan:
      - Actualizar estaciones de trabajo
      - Crear registros de historial de asignación
      - Actualizar registros de historial para marcarlos como no asignados

  2. Seguridad
    - Las políticas permiten acceso público para todas las operaciones
    - Esto es consistente con las políticas de SELECT existentes
    - Todas las tablas mantienen RLS habilitado para control de acceso
*/

-- Política para permitir actualizar estaciones de trabajo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workstations' 
    AND policyname = 'Allow public to update workstations'
  ) THEN
    CREATE POLICY "Allow public to update workstations"
      ON workstations
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Política para permitir insertar historial de asignación
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignment_history' 
    AND policyname = 'Allow public to insert assignment history'
  ) THEN
    CREATE POLICY "Allow public to insert assignment history"
      ON assignment_history
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Política para permitir actualizar historial de asignación
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignment_history' 
    AND policyname = 'Allow public to update assignment history'
  ) THEN
    CREATE POLICY "Allow public to update assignment history"
      ON assignment_history
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
