import { useState, useRef, useEffect } from 'react';
import { useWorkstations, useMapElements } from '../hooks/useData';
import { Monitor, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Props {
  siteId: string;
  siteName: string;
}

export default function ReadOnlyMapView({ siteId, siteName }: Props) {
  const { workstations } = useWorkstations(siteId);
  const { elements } = useMapElements(siteId);
  const [scale, setScale] = useState(1);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [hoveredWorkstation, setHoveredWorkstation] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredWorkstations = workstations.filter(ws => ws.floor === selectedFloor);
  const filteredElements = elements.filter(el => el.floor === selectedFloor);
  const availableFloors = Array.from(new Set(workstations.map(ws => ws.floor || 0))).sort((a, b) => a - b);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, []);

  useEffect(() => {
    if (!containerRef.current || (filteredWorkstations.length === 0 && filteredElements.length === 0)) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    filteredWorkstations.forEach(ws => {
      const widthPx = ws.width_cm || 120;
      const heightPx = ws.height_cm || 55;
      minX = Math.min(minX, ws.position_x);
      minY = Math.min(minY, ws.position_y);
      maxX = Math.max(maxX, ws.position_x + widthPx);
      maxY = Math.max(maxY, ws.position_y + heightPx);
    });

    filteredElements.forEach(el => {
      minX = Math.min(minX, el.position_x);
      minY = Math.min(minY, el.position_y);
      maxX = Math.max(maxX, el.position_x + el.width);
      maxY = Math.max(maxY, el.position_y + el.height);
    });

    if (minX !== Infinity) {
      const contentWidth = maxX - minX + 100;
      const contentHeight = maxY - minY + 100;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const autoScale = Math.min(scaleX, scaleY, 1);

      setScale(autoScale);
    }
  }, [filteredWorkstations, filteredElements]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{siteName}</h2>
          <p className="text-sm text-gray-600 mt-1">{workstations.length} workstations - Read Only View</p>
        </div>
        <div className="flex items-center gap-2">
          {availableFloors.length > 1 && (
            <div className="flex items-center gap-2 mr-4">
              <label className="text-sm font-medium text-gray-700">Floor:</label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableFloors.map(floor => (
                  <option key={floor} value={floor}>
                    {floor === 0 ? 'Ground Floor' : floor > 0 ? `Floor ${floor}` : `Basement ${Math.abs(floor)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 relative"
      >
        <div className="absolute bottom-6 right-6 flex flex-col gap-2" style={{ zIndex: 1000 }}>
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.2, 3))}
            className="p-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 shadow-lg transition-all hover:shadow-xl"
            type="button"
            title="Zoom In"
          >
            <ZoomIn className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.2, 0.1))}
            className="p-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 shadow-lg transition-all hover:shadow-xl"
            type="button"
            title="Zoom Out"
          >
            <ZoomOut className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={() => setScale(1)}
            className="p-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 shadow-lg transition-all hover:shadow-xl"
            type="button"
            title="Reset Zoom"
          >
            <Maximize2 className="w-6 h-6 text-gray-700" />
          </button>
          <div className="text-center text-xs bg-white border-2 border-gray-300 rounded-lg px-2 py-1 shadow-lg">
            {Math.round(scale * 100)}%
          </div>
        </div>
        <div
          ref={mapRef}
          className="relative min-h-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${200 / scale}%`,
            height: `${200 / scale}%`,
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        >
          {filteredElements.map((element) => (
            <div
              key={element.id}
              className="absolute pointer-events-none"
              style={{
                left: `${element.position_x}px`,
                top: `${element.position_y}px`,
                width: `${element.width}px`,
                height: `${element.height}px`,
                transform: `rotate(${element.rotation || 0}deg)`,
              }}
            >
              {element.type === 'box' && (
                <div className={`w-full h-full ${element.fill_color || 'bg-gray-200'} rounded border-2 ${element.stroke_color || 'border-gray-400'}`} />
              )}
              {element.type === 'label' && (
                <div className="flex items-center justify-center h-full">
                  <span className={`font-semibold ${element.text_color || 'text-gray-900'}`} style={{ fontSize: `${element.font_size || 16}px` }}>
                    {element.content}
                  </span>
                </div>
              )}
              {element.type === 'icon' && element.image_url && (
                <img src={element.image_url} alt={element.content || 'Icon'} className="w-full h-full object-contain" />
              )}
            </div>
          ))}

          {filteredWorkstations.map((ws) => {
            const widthPx = ws.width_cm || 120;
            const heightPx = ws.height_cm || 55;
            const isHovered = hoveredWorkstation === ws.id;

            return (
              <div
                key={ws.id}
                onMouseEnter={() => setHoveredWorkstation(ws.id)}
                onMouseLeave={() => setHoveredWorkstation(null)}
                className={`absolute select-none transition-shadow ${getStatusColor(ws.status)} text-white rounded-lg shadow-lg border-2 border-white`}
                style={{
                  left: `${ws.position_x}px`,
                  top: `${ws.position_y}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  transform: `rotate(${ws.rotation || 0}deg)`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '8px',
                }}
              >
                <div className="text-center pointer-events-none">
                  <div className="font-bold text-sm truncate">{ws.asset_tag || 'No Tag'}</div>
                  {ws.employees && (
                    <div className="text-xs opacity-90 truncate">{ws.employees.name}</div>
                  )}
                </div>

                {isHovered && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap pointer-events-none" style={{ zIndex: 9999 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="w-4 h-4" />
                      <span className="font-semibold">{ws.type || 'Workstation'}</span>
                    </div>
                    <div className="text-gray-300">{ws.width_cm}×{ws.height_cm} px</div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-3 flex gap-6 items-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Not Available</span>
        </div>
      </div>
    </div>
  );
}
