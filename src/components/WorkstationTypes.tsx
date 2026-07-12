import { useState } from 'react';
import { useWorkstationTypes } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Box, X } from 'lucide-react';
import { useAuthorization } from '../hooks/useAuthorization';
import { MODULE_KEYS } from '../lib/moduleKeys';
import type { WorkstationType } from '../hooks/useData';

export default function WorkstationTypes() {
  const { types, loading, refetch } = useWorkstationTypes();
  const { permissions, loading: permissionsLoading } = useAuthorization(MODULE_KEYS.workstation_types);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkstationType | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este tipo de estación?')) return;
    await supabase.from('workstation_types').delete().eq('id', id);
    refetch();
  };

  if (loading || permissionsLoading) return <div className="text-center py-12 text-gray-500">Cargando...</div>;

  if (!permissions.canList) {
    return (
      <div className="text-center py-12">
        <Box className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
        <p className="text-gray-500">You don't have permission to view workstation types</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tipos de Estaciones</h1>
          <p className="text-gray-600 mt-1">Administre plantillas de tipos de estación con dimensiones</p>
        </div>
        {permissions.canEdit && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Plus className="w-5 h-5" />Agregar Tipo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map(type => (
          <div key={type.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Box className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex gap-2">
                {permissions.canEdit && (
                  <button onClick={() => { setEditing(type); setShowForm(true); }} className="p-2 hover:bg-blue-50 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {permissions.canDelete && (
                  <button onClick={() => handleDelete(type.id)} className="p-2 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2">{type.name}</h3>
            {(type.is_administrative || type.is_operational) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {type.is_operational && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    Puesto Operativo
                  </span>
                )}
                {type.is_administrative && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Puesto Administrativo
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ancho:</span>
                <span className="font-medium">{type.width_cm} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alto:</span>
                <span className="font-medium">{type.height_cm} cm</span>
              </div>
              {type.description && (
                <div className="pt-2 border-t">
                  <p className="text-gray-600">{type.description}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {types.length === 0 && (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Box className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No hay tipos de estaciones aún</h3>
          <p className="text-gray-600 mt-1">Cree su primera plantilla de tipo de estación</p>
        </div>
      )}

      {showForm && <TypeForm type={editing} onClose={() => { setShowForm(false); setEditing(null); refetch(); }} />}
    </div>
  );
}

function TypeForm({ type, onClose }: { type: WorkstationType | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: type?.name || '',
    width_cm: type?.width_cm || 120,
    height_cm: type?.height_cm || 55,
    description: type?.description || '',
    is_administrative: type?.is_administrative || false,
    is_operational: type?.is_operational || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, description: form.description || null };
    if (type) {
      await supabase.from('workstation_types').update(data).eq('id', type.id);
    } else {
      await supabase.from('workstation_types').insert(data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">{type ? 'Editar Tipo de Estación' : 'Agregar Tipo de Estación'}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              placeholder="ej., Isla, Individual, Escritorio en L"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ancho (cm) *</label>
              <input
                type="number"
                required
                min="1"
                value={form.width_cm}
                onChange={(e) => setForm({ ...form, width_cm: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alto (cm) *</label>
              <input
                type="number"
                required
                min="1"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              placeholder="Descripción opcional..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
            />
          </div>

          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm font-semibold text-gray-700 mb-2">Categoría del Puesto</div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_operational"
                checked={form.is_operational}
                onChange={(e) => setForm({ ...form, is_operational: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_operational" className="text-sm font-medium text-gray-700">
                Puesto Operativo (producción/servicio)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_administrative"
                checked={form.is_administrative}
                onChange={(e) => setForm({ ...form, is_administrative: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="is_administrative" className="text-sm font-medium text-gray-700">
                Puesto Administrativo (gestión/soporte)
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{type ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
