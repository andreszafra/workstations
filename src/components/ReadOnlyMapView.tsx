import { useState } from 'react';
import { useWorkstations, useMapElements } from '../hooks/useData';
import MapCanvas from './map/MapCanvas';

interface Props {
  siteId: string;
  siteName: string;
}

export default function ReadOnlyMapView({ siteId, siteName }: Props) {
  const { workstations } = useWorkstations(siteId);
  const { elements } = useMapElements(siteId);

  const availableFloors = Array.from(new Set(workstations.map(ws => ws.floor || 0))).sort((a, b) => a - b);
  const [selectedFloor, setSelectedFloor] = useState<number>(availableFloors[0] || 0);

  const filteredWorkstations = workstations.filter(ws => (ws.floor || 0) === selectedFloor);
  const filteredElements = elements.filter(el => (el.floor || 0) === selectedFloor);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{siteName}</h2>
          <p className="text-sm text-gray-600 mt-1">{workstations.length} estaciones de trabajo - Vista de Solo Lectura</p>
        </div>
        <div className="flex items-center gap-2">
          {availableFloors.length > 1 && (
            <div className="flex items-center gap-2 mr-4">
              <label className="text-sm font-medium text-gray-700">Piso:</label>
              <select
                value={selectedFloor}
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
        </div>
      </div>

      <div className="flex-1 relative">
        <MapCanvas
          workstations={filteredWorkstations}
          elements={filteredElements}
          isReadOnly={true}
        />
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-3 flex gap-6 items-center text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Asignada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Mantenimiento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span>No Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>Fuera de Servicio</span>
        </div>
      </div>
    </div>
  );
}
