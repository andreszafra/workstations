/*
  # Corrección de Problemas de Seguridad e Índices

  ## Cambios Realizados
  
  ### 1. Índices para Claves Foráneas
  - Se agregan índices para `assignment_history.employee_id`
  - Se agregan índices para `workstations.assigned_to`
  
  ### 2. Eliminación de Índices No Utilizados
  - Se eliminan índices que no están siendo usados por el sistema
  
  ### 3. Corrección de Políticas RLS
  - Se desactiva RLS para tablas sin autenticación
  - Las políticas con `USING (true)` se eliminan ya que no proporcionan seguridad real
  - Como este es un sistema sin autenticación, es más transparente desactivar RLS
    que tener políticas permisivas que dan falsa sensación de seguridad
  
  ## Nota de Seguridad
  Este sistema actualmente no tiene autenticación implementada. Las tablas están
  configuradas para acceso público total. Si en el futuro se implementa autenticación,
  será necesario:
  1. Habilitar RLS en las tablas
  2. Crear políticas restrictivas basadas en usuarios autenticados
*/

-- ============================================================================
-- 1. AGREGAR ÍNDICES FALTANTES PARA CLAVES FORÁNEAS
-- ============================================================================

-- Índice para assignment_history.employee_id
CREATE INDEX IF NOT EXISTS idx_assignment_history_employee_id 
ON assignment_history(employee_id);

-- Índice para workstations.assigned_to
CREATE INDEX IF NOT EXISTS idx_workstations_assigned_to 
ON workstations(assigned_to);

-- ============================================================================
-- 2. ELIMINAR ÍNDICES NO UTILIZADOS
-- ============================================================================

-- Eliminar índices que no están siendo usados
DROP INDEX IF EXISTS idx_employee_history_site_id;
DROP INDEX IF EXISTS idx_employee_history_workstation_id;
DROP INDEX IF EXISTS idx_map_elements_site_id;
DROP INDEX IF EXISTS idx_workstation_assets_asset_id;
DROP INDEX IF EXISTS idx_workstations_workstation_type_id;

-- ============================================================================
-- 3. CORREGIR POLÍTICAS RLS
-- ============================================================================

-- Como este sistema no tiene autenticación, es más transparente desactivar RLS
-- que tener políticas permisivas que no proporcionan seguridad real

-- Tabla: assignment_history
ALTER TABLE assignment_history DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to delete assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Allow public to insert assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Allow public to update assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Allow public read access to assignment history" ON assignment_history;

-- Tabla: employee_history
ALTER TABLE employee_history DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public delete access for employee_history" ON employee_history;
DROP POLICY IF EXISTS "Public insert access for employee_history" ON employee_history;
DROP POLICY IF EXISTS "Public update access for employee_history" ON employee_history;
DROP POLICY IF EXISTS "Public read access for employee_history" ON employee_history;

-- Tabla: employees
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to delete employees" ON employees;
DROP POLICY IF EXISTS "Allow public to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow public to update employees" ON employees;
DROP POLICY IF EXISTS "Allow public read access to employees" ON employees;

-- Tabla: fixed_assets
ALTER TABLE fixed_assets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public delete access for fixed_assets" ON fixed_assets;
DROP POLICY IF EXISTS "Public insert access for fixed_assets" ON fixed_assets;
DROP POLICY IF EXISTS "Public update access for fixed_assets" ON fixed_assets;
DROP POLICY IF EXISTS "Public read access for fixed_assets" ON fixed_assets;

-- Tabla: maintenance_logs
ALTER TABLE maintenance_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to delete maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow public to insert maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow public to update maintenance logs" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow public read access to maintenance logs" ON maintenance_logs;

-- Tabla: map_elements
ALTER TABLE map_elements DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to delete map elements" ON map_elements;
DROP POLICY IF EXISTS "Allow public to insert map elements" ON map_elements;
DROP POLICY IF EXISTS "Allow public to update map elements" ON map_elements;
DROP POLICY IF EXISTS "Allow public read access to map elements" ON map_elements;

-- Tabla: sites
ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to delete sites" ON sites;
DROP POLICY IF EXISTS "Allow public to insert sites" ON sites;
DROP POLICY IF EXISTS "Allow public to update sites" ON sites;
DROP POLICY IF EXISTS "Allow public read access to sites" ON sites;

-- Tabla: workstation_assets
ALTER TABLE workstation_assets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public delete access for workstation_assets" ON workstation_assets;
DROP POLICY IF EXISTS "Public insert access for workstation_assets" ON workstation_assets;
DROP POLICY IF EXISTS "Public update access for workstation_assets" ON workstation_assets;
DROP POLICY IF EXISTS "Public read access for workstation_assets" ON workstation_assets;

-- Tabla: workstation_types
ALTER TABLE workstation_types DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert access for workstation_types" ON workstation_types;
DROP POLICY IF EXISTS "Public update access for workstation_types" ON workstation_types;
DROP POLICY IF EXISTS "Public delete access for workstation_types" ON workstation_types;
DROP POLICY IF EXISTS "Public read access for workstation_types" ON workstation_types;

-- Tabla: workstations
ALTER TABLE workstations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to delete workstations" ON workstations;
DROP POLICY IF EXISTS "Allow public to insert workstations" ON workstations;
DROP POLICY IF EXISTS "Allow public to update workstations" ON workstations;
DROP POLICY IF EXISTS "Allow public read access to workstations" ON workstations;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE assignment_history IS 'Tabla de historial de asignaciones - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE employee_history IS 'Tabla de historial de empleados - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE employees IS 'Tabla de empleados - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE fixed_assets IS 'Tabla de activos fijos - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE maintenance_logs IS 'Tabla de registros de mantenimiento - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE map_elements IS 'Tabla de elementos del mapa - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE sites IS 'Tabla de sedes - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE workstation_assets IS 'Tabla de activos de estaciones - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE workstation_types IS 'Tabla de tipos de estaciones - RLS deshabilitado (sistema sin autenticación)';
COMMENT ON TABLE workstations IS 'Tabla de estaciones de trabajo - RLS deshabilitado (sistema sin autenticación)';
