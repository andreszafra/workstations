import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Palette, Save, RefreshCw, Upload, Image as ImageIcon, RotateCcw } from 'lucide-react';

export default function InterfaceManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [defaultPrimaryColor, setDefaultPrimaryColor] = useState('#2563eb');
  const [defaultSecondaryColor, setDefaultSecondaryColor] = useState('#1e40af');
  const [genericLogoUrl, setGenericLogoUrl] = useState('');

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('system_config')
      .select('primary_color, default_secondary_color, generic_logo_url')
      .limit(1)
      .maybeSingle();

    if (data) {
      setDefaultPrimaryColor(data.primary_color || '#2563eb');
      setDefaultSecondaryColor(data.default_secondary_color || '#1e40af');
      setGenericLogoUrl(data.generic_logo_url || '');
    }

    setLoading(false);
  };

  const handleSaveSystemColors = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: existing } = await supabase
        .from('system_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_config')
          .update({
            primary_color: defaultPrimaryColor,
            default_secondary_color: defaultSecondaryColor,
            generic_logo_url: genericLogoUrl || null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_config')
          .insert({
            primary_color: defaultPrimaryColor,
            default_secondary_color: defaultSecondaryColor,
            generic_logo_url: genericLogoUrl || null,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar la configuración' });
    }

    setSaving(false);
  };

  const handleResetAllUsers = async () => {
    if (!confirm('¿Estás seguro de que deseas resetear los colores de todos los usuarios a los valores por defecto? Esta acción no se puede deshacer.')) {
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setMessage({ type: 'success', text: 'Todos los usuarios han sido reseteados a los colores por defecto' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al resetear usuarios' });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestión de Interfaz</h2>
            <p className="text-sm text-gray-600 mt-1">Configura los colores y apariencia del sistema</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {message.text && (
          <div
            className={`p-4 rounded-lg border mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="max-w-3xl space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Colores del Sistema
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Estos son los colores por defecto que se aplicarán a nuevos usuarios
              </p>
            </div>

            <form onSubmit={handleSaveSystemColors} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Primario Por Defecto
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={defaultPrimaryColor}
                    onChange={(e) => setDefaultPrimaryColor(e.target.value)}
                    className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={defaultPrimaryColor}
                    onChange={(e) => setDefaultPrimaryColor(e.target.value)}
                    className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="#2563eb"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Este color se aplicará a botones y elementos principales
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Secundario Por Defecto
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={defaultSecondaryColor}
                    onChange={(e) => setDefaultSecondaryColor(e.target.value)}
                    className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={defaultSecondaryColor}
                    onChange={(e) => setDefaultSecondaryColor(e.target.value)}
                    className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="#1e40af"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Este color se usará para acentos y elementos secundarios
                </p>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Vista Previa</h4>
                <div className="flex gap-3 items-center">
                  <div
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: defaultPrimaryColor }}
                  >
                    Color Primario
                  </div>
                  <div
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: defaultSecondaryColor }}
                  >
                    Color Secundario
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Guardando...' : 'Guardar Colores'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Logo Genérico del Sistema
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Este logo se mostrará a usuarios que no tengan una empresa asignada
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL del Logo Genérico
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={genericLogoUrl}
                    onChange={(e) => setGenericLogoUrl(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa la URL de una imagen para el logo genérico del sistema
                </p>
              </div>

              {genericLogoUrl && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Vista Previa</h4>
                  <div className="flex items-center gap-4">
                    <img
                      src={genericLogoUrl}
                      alt="Logo genérico"
                      className="h-16 w-16 object-contain rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <p className="text-sm text-gray-600">
                      El logo se mostrará en un contenedor de 48x48 píxeles en la barra superior
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Resetear Usuarios
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Restablece los colores personalizados de todos los usuarios
              </p>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Advertencia:</strong> Esta acción eliminará todas las preferencias de color personalizadas
                  de todos los usuarios y les aplicará los colores por defecto del sistema. Esta acción no se puede deshacer.
                </p>
              </div>

              <button
                onClick={handleResetAllUsers}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-5 h-5" />
                {saving ? 'Reseteando...' : 'Resetear Todos los Usuarios'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los cambios en los colores por defecto solo afectarán a nuevos usuarios
              y a usuarios que hayan sido reseteados. Los usuarios con colores personalizados mantendrán
              sus preferencias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
