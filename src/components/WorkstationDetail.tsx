import { useState } from 'react';
import { useMaintenanceLogs, useAssignmentHistory, useEmployees, useSites, useWorkstationTypes, useWorkstations } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { X, Monitor, Calendar, User, MapPin, Wrench, Clock, Edit, Plus } from 'lucide-react';
import type { WorkstationWithDetails } from '../lib/database.types';

interface Props {
  workstation: WorkstationWithDetails;
  onClose: () => void;
  initiallyEditing?: boolean;
}

export default function WorkstationDetail({ workstation, onClose, initiallyEditing = false }: Props) {
  const { logs, refetch: refetchLogs } = useMaintenanceLogs(workstation.id);
  const { history } = useAssignmentHistory(workstation.id);
  const { employees } = useEmployees();
  const { sites } = useSites();
  const { types } = useWorkstationTypes();
  const { workstations: allWorkstations } = useWorkstations();
  const [activeTab, setActiveTab] = useState<'details' | 'maintenance' | 'history'>('details');
  const [editing, setEditing] = useState(initiallyEditing);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [form, setForm] = useState({
    asset_tag: workstation.asset_tag,
    status: workstation.status,
    unavailable_reason: workstation.unavailable_reason,
    site_id: workstation.site_id,
    floor: workstation.floor || 0,
    assigned_to: workstation.assigned_to,
    workstation_type_id: workstation.workstation_type_id,
    notes: workstation.notes,
  });

  const handleUpdate = async () => {
    if (isManualStatus(form.status) && form.assigned_to) {
      alert('No se puede asignar un empleado a una estación con estado manual (pendiente, no disponible o fuera de servicio). Por favor cambie el estado primero.');
      return;
    }

    try {
      const data = {
        asset_tag: form.asset_tag,
        status: form.status,
        unavailable_reason: form.unavailable_reason,
        site_id: form.site_id || null,
        floor: form.floor,
        assigned_to: form.assigned_to || null,
        workstation_type_id: form.workstation_type_id || null,
        notes: form.notes,
      };

      const { error: updateError } = await supabase.from('workstations').update(data).eq('id', workstation.id);

      if (updateError) {
        console.error('Error updating workstation:', updateError);
        alert('Error al actualizar la estación de trabajo');
        return;
      }

      setEditing(false);
      onClose();
    } catch (error) {
      console.error('Error in handleUpdate:', error);
      alert('Error al guardar los cambios');
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await supabase.from('maintenance_logs').insert({
      workstation_id: workstation.id,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      cost: parseFloat(formData.get('cost') as string) || 0,
      performed_by: formData.get('performed_by') as string,
    });
    refetchLogs();
    setShowMaintenanceForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      case 'out_of_service': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isManualStatus = (status: string) => {
    return ['pending', 'unavailable', 'out_of_service'].includes(status);
  };

  const getAvailableEmployees = () => {
    const assignedEmployeeIds = allWorkstations
      .filter(ws => ws.assigned_to && ws.id !== workstation.id)
      .map(ws => ws.assigned_to);

    return employees
      .filter(e => !form.site_id || e.site_id === form.site_id)
      .filter(e => !assignedEmployeeIds.includes(e.id));
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'available': 'Disponible',
      'assigned': 'Asignado',
      'maintenance': 'Mantenimiento',
      'pending': 'Pendiente',
      'unavailable': 'No Disponible',
      'out_of_service': 'Fuera de Servicio'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'inspection': 'Inspección',
      'repair': 'Reparación',
      'upgrade': 'Mejora',
      'cleaning': 'Limpieza'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Monitor className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{workstation.asset_tag || 'Sin Etiqueta'}</h2>
              <p className="text-sm text-gray-600">{workstation.type}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workstation.status)}`}>
              {getStatusLabel(workstation.status)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 hover:bg-blue-50 rounded-lg">
                <Edit className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 border-b-2 font-medium ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
            >
              Detalles
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`py-3 border-b-2 font-medium ${activeTab === 'maintenance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
            >
              Mantenimiento
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 border-b-2 font-medium ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
            >
              Historial
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta de Activo</label>
                    <input type="text" placeholder="Etiqueta de Activo" value={form.asset_tag || ''} onChange={e => setForm({...form, asset_tag: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Estación</label>
                    <select value={form.workstation_type_id || ''} onChange={e => setForm({...form, workstation_type_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Sin Tipo</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({...form, status: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <optgroup label="Estado Automático">
                        <option value="available">Disponible</option>
                        <option value="assigned">Asignado</option>
                        <option value="maintenance">Mantenimiento</option>
                      </optgroup>
                      <optgroup label="Estado Manual">
                        <option value="pending">Pendiente</option>
                        <option value="unavailable">No Disponible</option>
                        <option value="out_of_service">Fuera de Servicio</option>
                      </optgroup>
                    </select>
                    {isManualStatus(form.status) ? (
                      <p className="text-xs text-orange-600 mt-1">
                        Estado manual - no se actualizará automáticamente. No se pueden asignar empleados con este estado.
                      </p>
                    ) : (
                      <p className="text-xs text-blue-600 mt-1">
                        Estado automático - se actualiza según la asignación de empleados
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                    <select value={form.site_id || ''} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Sin Sede</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Piso</label>
                    <select value={form.floor} onChange={e => setForm({...form, floor: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg">
                      <option value="0">Planta Baja</option>
                      <option value="1">Piso 1</option>
                      <option value="2">Piso 2</option>
                      <option value="3">Piso 3</option>
                      <option value="4">Piso 4</option>
                      <option value="5">Piso 5</option>
                      <option value="-1">Sótano 1</option>
                      <option value="-2">Sótano 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignado A</label>
                    <select
                      value={form.assigned_to || ''}
                      onChange={e => setForm({...form, assigned_to: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={isManualStatus(form.status)}
                    >
                      <option value="">Sin Empleado</option>
                      {getAvailableEmployees().map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    {isManualStatus(form.status) && (
                      <p className="text-sm text-orange-600 mt-1">Cambie el estado para asignar un empleado</p>
                    )}
                    {!isManualStatus(form.status) && form.site_id && getAvailableEmployees().length === 0 && !form.assigned_to && (
                      <p className="text-sm text-gray-500 mt-1">No hay empleados disponibles sin puesto asignado en esta sede</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Razón de No Disponibilidad (Opcional)</label>
                    <input type="text" placeholder="Agregue una razón si la estación no está disponible" value={form.unavailable_reason || ''} onChange={e => setForm({...form, unavailable_reason: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea placeholder="Notas" value={form.notes || ''} rows={3} onChange={e => setForm({...form, notes: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div className="col-span-2 flex gap-3">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                    <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><label className="text-sm text-gray-600">Tipo</label><p className="font-medium">{workstation.workstation_types?.name || '-'}</p></div>
                    <div><label className="text-sm text-gray-600 flex gap-2"><MapPin className="w-4 h-4"/>Sede</label><p className="font-medium">{workstation.sites?.name || 'Sin Asignar'}</p></div>
                    <div><label className="text-sm text-gray-600">Piso</label><p className="font-medium">{workstation.floor === 0 ? 'Planta Baja' : workstation.floor > 0 ? `Piso ${workstation.floor}` : `Sótano ${Math.abs(workstation.floor)}`}</p></div>
                  </div>
                  <div className="space-y-4">
                    <div><label className="text-sm text-gray-600 flex gap-2"><User className="w-4 h-4"/>Asignado A</label><p className="font-medium">{workstation.employees?.name || 'Sin Asignar'}</p></div>
                    {workstation.unavailable_reason && (
                      <div><label className="text-sm text-gray-600">Razón</label><p className="font-medium text-red-600">{workstation.unavailable_reason}</p></div>
                    )}
                  </div>
                  {workstation.notes && (
                    <div className="col-span-2"><label className="text-sm text-gray-600">Notas</label><p className="bg-gray-50 p-3 rounded-lg">{workstation.notes}</p></div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold">Historial de Mantenimiento</h3>
                <button onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                  className="flex gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  <Plus className="w-4 h-4" />Agregar Registro
                </button>
              </div>

              {showMaintenanceForm && (
                <form onSubmit={handleAddMaintenance} className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <select name="type" required className="w-full px-3 py-2 border rounded-lg">
                    <option value="inspection">Inspección</option>
                    <option value="repair">Reparación</option>
                    <option value="upgrade">Mejora</option>
                    <option value="cleaning">Limpieza</option>
                  </select>
                  <textarea name="description" required placeholder="Descripción" rows={3} className="w-full px-3 py-2 border rounded-lg" />
                  <div className="grid grid-cols-2 gap-3">
                    <input name="cost" type="number" step="0.01" placeholder="Costo ($)" className="px-3 py-2 border rounded-lg" />
                    <input name="performed_by" type="text" placeholder="Realizado Por" className="px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowMaintenanceForm(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Agregar</button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <div className="flex gap-2">
                        <Wrench className="w-4 h-4 text-gray-500" />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.type === 'repair' ? 'bg-red-100 text-red-800' :
                          log.type === 'upgrade' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>{getTypeLabel(log.type)}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex gap-1">
                        <Calendar className="w-4 h-4" />{new Date(log.date).toLocaleDateString('es')}
                      </div>
                    </div>
                    <p className="mb-2">{log.description}</p>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{log.performed_by || 'Desconocido'}</span>
                      <span className="font-medium">${parseFloat(log.cost.toString()).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-center text-gray-500 py-8">No hay registros de mantenimiento</p>}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Historial de Asignaciones</h3>
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="border rounded-lg p-4">
                    <div className="flex gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{h.employee_name}</p>
                        <div className="flex gap-2 text-sm text-gray-600 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(h.assigned_at).toLocaleDateString('es')}</span>
                          {h.unassigned_at ? (
                            <><span>→</span><span>{new Date(h.unassigned_at).toLocaleDateString('es')}</span></>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs ml-2">Actual</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-center text-gray-500 py-8">No hay historial de asignaciones</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
