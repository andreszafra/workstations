/*
  # Configuración del Sistema
  
  1. Nueva Tabla
    - `system_config`
      - `id` (uuid, clave primaria)
      - `access_key` (texto) - Palabra clave de acceso
      - `site_title` (texto) - Título del sitio
      - `site_subtitle` (texto) - Subtítulo del sitio
      - `logo_icon` (texto) - Icono para el logo (nombre de lucide-react)
      - `favicon_url` (texto) - URL del favicon
      - `primary_color` (texto) - Color primario en formato hex
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Seguridad
    - RLS deshabilitado (sistema sin autenticación)
  
  3. Datos Iniciales
    - Se crea una fila de configuración por defecto
*/

-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key text DEFAULT 'admin',
  site_title text DEFAULT 'Gestor de Estaciones de Trabajo',
  site_subtitle text DEFAULT 'Gestión Visual de Activos',
  logo_icon text DEFAULT 'Monitor',
  favicon_url text,
  primary_color text DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deshabilitar RLS (sistema sin autenticación)
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;

-- Insertar configuración por defecto
INSERT INTO system_config (access_key, site_title, site_subtitle, logo_icon, primary_color)
VALUES ('admin', 'Gestor de Estaciones de Trabajo', 'Gestión Visual de Activos', 'Monitor', '#2563eb')
ON CONFLICT DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_system_config_updated_at_trigger ON system_config;
CREATE TRIGGER update_system_config_updated_at_trigger
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_updated_at();

COMMENT ON TABLE system_config IS 'Configuración global del sistema - RLS deshabilitado (sistema sin autenticación)';
