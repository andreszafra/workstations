import { useState, useEffect } from 'react';
import { useWorkstations, useMapElements, type MapElement } from '../hooks/useData';
import { useAuthorization } from '../hooks/useAuthorization';
import { supabase } from '../lib/supabase';
import { Plus, Share2, Square, Type, Image, Edit2, Trash2, RotateCw } from 'lucide-react';
import WorkstationDetail from './WorkstationDetail';
import type { WorkstationWithDetails } from '../lib/database.types';
import MapCanvas from './map/MapCanvas';

interface Props {
  siteId: string;
  siteName: string;
}

export default function SiteMap({ siteId, siteName }: Props) {
  const { workstations, refetch } = useWorkstations(siteId);
  const { elements, refetch: refetchElements } = useMapElements(siteId);
  const { userId, getUserPrimaryGroup } = useAuthorization('map_elements');
  const { permissions: sitePermissions } = useAuthorization('sites');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedWorkstation, setSelectedWorkstation] = useState<WorkstationWithDetails | null>(null);
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [editingElement, setEditingElement] = useState<MapElement | null>(null);
  const [editingWorkstationSize, setEditingWorkstationSize] = useState<WorkstationWithDetails | null>(null);
  const [editingWorkstationOrientation, setEditingWorkstationOrientation] = useState<WorkstationWithDetails | null>(null);
  const [showAddElement, setShowAddElement] = useState(false);
  const [addingElementType, setAddingElementType] = useState<'box' | 'label' | 'icon'>('box');
  const [isEditMode, setIsEditMode] = useState(false);

  const availableFloors = Array.from(new Set(workstations.map(ws => ws.floor || 0))).sort((a, b) => a - b);

  useEffect(() => {
    if (selectedFloor === null && availableFloors.length > 0) {
      setSelectedFloor(availableFloors[0]);
    }
  }, [availableFloors.length, selectedFloor]);

  const currentFloor = selectedFloor ?? (availableFloors[0] ?? 0);
  const filteredWorkstations = workstations.filter(ws => (ws.floor || 0) === currentFloor);
  const filteredElements = elements.filter(el => (el.floor || 0) === currentFloor);

  const handleWorkstationMove = async (id: string, x: number, y: number) => {
    await supabase.from('workstations').update({ position_x: x, position_y: y }).eq('id', id);
    refetch();
  };

  const handleWorkstationResize = async (id: string, x: number, y: number, width: number, height: number) => {
    await supabase.from('workstations').update({
      position_x: x,
      position_y: y,
      width_cm: width,
      height_cm: height,
    }).eq('id', id);
    refetch();
  };

  const handleWorkstationRotate = async (id: string) => {
    const ws = workstations.find(w => w.id === id);
    if (!ws) return;
    const newRotation = ((ws.rotation || 0) + 90) % 360;
    await supabase.from('workstations').update({ rotation: newRotation }).eq('id', id);
    refetch();
  };

  const handleElementMove = async (id: string, x: number, y: number) => {
    await supabase.from('map_elements').update({ position_x: x, position_y: y }).eq('id', id);
    refetchElements();
  };

  const handleElementResize = async (id: string, x: number, y: number, width: number, height: number) => {
    await supabase.from('map_elements').update({
      position_x: x,
      position_y: y,
      width,
      height,
    }).eq('id', id);
    refetchElements();
  };

  const handleElementRotate = async (id: string) => {
    const element = elements.find(e => e.id === id);
    if (!element) return;
    const newRotation = ((element.rotation || 0) + 90) % 360;
    await supabase.from('map_elements').update({ rotation: newRotation }).eq('id', id);
    refetchElements();
  };

  const handleUpdateWorkstationSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkstationSize) return;
    const formData = new FormData(e.target as HTMLFormElement);
    await supabase.from('workstations').update({
      width_cm: parseInt(formData.get('width_cm') as string),
      height_cm: parseInt(formData.get('height_cm') as string),
    }).eq('id', editingWorkstationSize.id);
    refetch();
    setEditingWorkstationSize(null);
  };

  const handleSetWorkstationOrientation = async (orientation: 'horizontal' | 'vertical') => {
    if (!editingWorkstationOrientation) return;

    const currentWidth = editingWorkstationOrientation.width_cm || 120;
    const currentHeight = editingWorkstationOrientation.height_cm || 55;

    const isCurrentlyHorizontal = currentWidth > currentHeight;
    const shouldChange = (orientation === 'vertical' && isCurrentlyHorizontal) ||
                         (orientation === 'horizontal' && !isCurrentlyHorizontal);

    if (shouldChange) {
      await supabase.from('workstations').update({
        width_cm: currentHeight,
        height_cm: currentWidth,
      }).eq('id', editingWorkstationOrientation.id);
    }

    refetch();
    setEditingWorkstationOrientation(null);
  };

  const handleAddElement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert('Debe estar autenticado para agregar elementos');
      return;
    }

    const primaryGroupId = await getUserPrimaryGroup();
    if (!primaryGroupId) {
      alert('No se encontró un grupo de seguridad para su usuario');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const { data, error } = await supabase.from('map_elements').insert({
      site_id: siteId,
      floor: currentFloor,
      type: addingElementType,
      position_x: 100,
      position_y: 100,
      width: parseInt(formData.get('width') as string) || 100,
      height: parseInt(formData.get('height') as string) || 100,
      color: formData.get('color') as string,
      label: formData.get('label') as string || '',
      image_url: formData.get('image_url') as string || '',
      border_width: parseInt(formData.get('border_width') as string) || 2,
      border_color: formData.get('border_color') as string || '#000000',
      has_shadow: formData.get('has_shadow') === 'on',
      rotation: 0,
      owner_security_group_id: primaryGroupId,
      created_by_user_id: userId,
    }).select();

    if (error) {
      console.error('Error adding element:', error);
      alert('Error al agregar elemento: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      setSelectedElement(data[0] as MapElement);
    }

    refetchElements();
    setShowAddElement(false);
  };

  const handleUpdateElement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingElement) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const { error } = await supabase.from('map_elements').update({
      width: parseInt(formData.get('width') as string),
      height: parseInt(formData.get('height') as string),
      color: formData.get('color') as string,
      label: formData.get('label') as string,
      image_url: formData.get('image_url') as string || '',
      border_width: parseInt(formData.get('border_width') as string) || 2,
      border_color: formData.get('border_color') as string || '#000000',
      has_shadow: formData.get('has_shadow') === 'on',
      updated_by_user_id: userId,
    }).eq('id', editingElement.id);

    if (error) {
      console.error('Error updating element:', error);
      alert('Error al actualizar elemento: ' + error.message);
      return;
    }

    refetchElements();
    setEditingElement(null);
    setSelectedElement(null);
  };

  const handleDeleteElement = async (id: string) => {
    await supabase.from('map_elements').delete().eq('id', id);
    refetchElements();
    setSelectedElement(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{siteName}</h2>
          <p className="text-sm text-gray-600 mt-1">{workstations.length} estaciones de trabajo</p>
        </div>
        <div className="flex items-center gap-2">
          {availableFloors.length > 1 && (
            <div className="flex items-center gap-2 mr-4">
              <label className="text-sm font-medium text-gray-700">Piso:</label>
              <select
                value={currentFloor}
                onChange={(e) => setSelectedFloor(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableFloors.map(floor => (
                  <option key={floor} value={floor}>
                    {floor === 0 ? 'Planta Baja' : floor > 0 ? `Piso ${floor}` : `Sótano ${Math.abs(floor)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?readonly=true&site=${siteId}&floor=${currentFloor}`;
              navigator.clipboard.writeText(url);
              alert('Enlace de solo lectura copiado al portapapeles');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
          {!isEditMode && sitePermissions.canEdit ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit Map
            </button>
          ) : isEditMode ? (
            <>
              <button
                onClick={() => setShowAddElement(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Elemento
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Done Editing
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex-1 relative">
        <MapCanvas
          workstations={filteredWorkstations}
          elements={filteredElements}
          isReadOnly={!isEditMode}
          onWorkstationClick={setSelectedWorkstation}
          onWorkstationDoubleClick={isEditMode ? setEditingWorkstationOrientation : undefined}
          onWorkstationMove={isEditMode ? handleWorkstationMove : undefined}
          onWorkstationResize={isEditMode ? handleWorkstationResize : undefined}
          onWorkstationRotate={isEditMode ? handleWorkstationRotate : undefined}
          onWorkstationEditSize={isEditMode ? setEditingWorkstationSize : undefined}
          onElementClick={setSelectedElement}
          onElementDoubleClick={isEditMode ? setEditingElement : undefined}
          onElementMove={isEditMode ? handleElementMove : undefined}
          onElementResize={isEditMode ? handleElementResize : undefined}
          onElementRotate={isEditMode ? handleElementRotate : undefined}
        />
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center text-sm">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Asignado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>No Disponible</span>
          </div>
        </div>
        {isEditMode && (
          <div className="flex items-center gap-2 text-gray-600">
            <RotateCw className="w-4 h-4" />
            <span className="text-xs font-medium">Doble clic en estaciones para cambiar orientación | Doble clic en elementos para redimensionar</span>
          </div>
        )}
      </div>


      {editingWorkstationSize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Tamaño de Estación</h2>
              <button onClick={() => setEditingWorkstationSize(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleUpdateWorkstationSize} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Ancho (px)</label>
                  <input
                    name="width_cm"
                    type="number"
                    defaultValue={editingWorkstationSize.width_cm || 120}
                    required
                    min="30"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Alto (px)</label>
                  <input
                    name="height_cm"
                    type="number"
                    defaultValue={editingWorkstationSize.height_cm || 55}
                    required
                    min="30"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Tamaño estándar de escritorio: 120 × 55 px</p>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setEditingWorkstationSize(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingElement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Editar Elemento</h2>
              <button onClick={() => setEditingElement(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleUpdateElement} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Ancho</label>
                  <input name="width" type="number" defaultValue={editingElement.width} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Alto</label>
                  <input name="height" type="number" defaultValue={editingElement.height} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              {editingElement.type !== 'label' && editingElement.type !== 'icon' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1">Color de Fondo</label>
                    <input name="color" type="color" defaultValue={editingElement.color} className="w-full h-10 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Ancho del Borde (px)</label>
                    <input name="border_width" type="number" defaultValue={editingElement.border_width || 2} min="0" max="10" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Color del Borde</label>
                    <input name="border_color" type="color" defaultValue={editingElement.border_color || '#000000'} className="w-full h-10 border rounded-lg" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="has_shadow" type="checkbox" defaultChecked={editingElement.has_shadow !== false} className="w-4 h-4 rounded border-gray-300" />
                      <span className="text-sm font-medium">Mostrar Sombra</span>
                    </label>
                  </div>
                </>
              )}
              {editingElement.type === 'icon' && (
                <div>
                  <label className="text-sm font-medium block mb-1">URL de Imagen</label>
                  <input name="image_url" type="url" defaultValue={editingElement.image_url} placeholder="https://ejemplo.com/imagen.png" className="w-full px-3 py-2 border rounded-lg" />
                  <p className="text-xs text-gray-500 mt-1">Ingrese una URL directa a una imagen PNG</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Etiqueta</label>
                <input name="label" type="text" defaultValue={editingElement.label} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex gap-3 justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar este elemento?')) {
                      handleDeleteElement(editingElement.id);
                      setEditingElement(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Eliminar
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingElement(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddElement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Agregar Elemento al Mapa</h2>
              <button onClick={() => setShowAddElement(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleAddElement} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Tipo de Elemento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'box' as const, icon: Square, label: 'Caja' },
                    { type: 'icon' as const, icon: Image, label: 'Ícono/Imagen' },
                    { type: 'label' as const, icon: Type, label: 'Etiqueta' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setAddingElementType(item.type)}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg ${
                        addingElementType === item.type ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Ancho</label>
                  <input name="width" type="number" defaultValue={100} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Alto</label>
                  <input name="height" type="number" defaultValue={100} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              {addingElementType !== 'label' && addingElementType !== 'icon' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1">Color de Fondo</label>
                    <input name="color" type="color" defaultValue="#94a3b8" className="w-full h-10 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Ancho del Borde (px)</label>
                    <input name="border_width" type="number" defaultValue={2} min="0" max="10" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Color del Borde</label>
                    <input name="border_color" type="color" defaultValue="#000000" className="w-full h-10 border rounded-lg" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="has_shadow" type="checkbox" defaultChecked={true} className="w-4 h-4 rounded border-gray-300" />
                      <span className="text-sm font-medium">Mostrar Sombra</span>
                    </label>
                  </div>
                </>
              )}
              {addingElementType === 'icon' && (
                <div>
                  <label className="text-sm font-medium block mb-1">URL de Imagen</label>
                  <input name="image_url" type="url" placeholder="https://ejemplo.com/imagen.png" className="w-full px-3 py-2 border rounded-lg" />
                  <p className="text-xs text-gray-500 mt-1">Ingrese una URL directa a un archivo PNG o imagen</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Etiqueta (Opcional)</label>
                <input name="label" type="text" placeholder="Ingrese texto de etiqueta" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setShowAddElement(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Agregar Elemento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingWorkstationOrientation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Seleccionar Orientación</h2>
              <button onClick={() => setEditingWorkstationOrientation(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Elija la orientación para esta estación de trabajo:</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSetWorkstationOrientation('horizontal')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-24 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">Horizontal</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Horizontal</span>
                </button>
                <button
                  onClick={() => handleSetWorkstationOrientation('vertical')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-16 h-24 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-semibold transform -rotate-90">Vertical</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Vertical</span>
                </button>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                Tamaño actual: {editingWorkstationOrientation.width_cm || 120} × {editingWorkstationOrientation.height_cm || 55} px
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedWorkstation && (
        <WorkstationDetail workstation={selectedWorkstation} onClose={() => { setSelectedWorkstation(null); refetch(); }} />
      )}
    </div>
  );
}
