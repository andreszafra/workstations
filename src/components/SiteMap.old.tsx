import { useState, useRef, useEffect } from 'react';
import { useWorkstations, useMapElements, type MapElement } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { Monitor, ZoomIn, ZoomOut, Maximize2, Square, Type, RotateCw, Trash2, Edit2, Plus, Image, Ruler, Share2 } from 'lucide-react';
import WorkstationDetail from './WorkstationDetail';
import type { WorkstationWithDetails } from '../lib/database.types';

interface Props {
  siteId: string;
  siteName: string;
}

interface DragState {
  type: 'workstation' | 'element';
  id: string;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  id: string;
  type: 'element' | 'workstation';
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startPosX?: number;
  startPosY?: number;
  handle: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  currentWidth?: number;
  currentHeight?: number;
  currentPosX?: number;
  currentPosY?: number;
}

export default function SiteMap({ siteId, siteName }: Props) {
  const { workstations, refetch } = useWorkstations(siteId);
  const { elements, refetch: refetchElements } = useMapElements(siteId);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [selectedWorkstation, setSelectedWorkstation] = useState<WorkstationWithDetails | null>(null);
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [editingElement, setEditingElement] = useState<MapElement | null>(null);
  const [editingWorkstationSize, setEditingWorkstationSize] = useState<WorkstationWithDetails | null>(null);
  const [showAddElement, setShowAddElement] = useState(false);
  const [addingElementType, setAddingElementType] = useState<'box' | 'label' | 'icon'>('box');
  const [hasMoved, setHasMoved] = useState(false);
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

  const handleMouseDown = (e: React.MouseEvent, type: 'workstation' | 'element', id: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const clickX = (e.clientX - panOffset.x) / scale;
    const clickY = (e.clientY - panOffset.y) / scale;

    setHasMoved(false);
    setIsPanning(false);
    setDragging({
      type,
      id,
      offsetX: clickX - currentX,
      offsetY: clickY - currentY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const mouseX = (e.clientX - panOffset.x) / scale;
    const mouseY = (e.clientY - panOffset.y) / scale;

    if (dragging) {
      setHasMoved(true);
      const newX = Math.max(0, Math.round(mouseX - dragging.offsetX));
      const newY = Math.max(0, Math.round(mouseY - dragging.offsetY));

      if (dragging.type === 'workstation') {
        supabase.from('workstations').update({ position_x: newX, position_y: newY }).eq('id', dragging.id).then(() => refetch());
      } else {
        supabase.from('map_elements').update({ position_x: newX, position_y: newY }).eq('id', dragging.id).then(() => refetchElements());
      }
    }

    if (resizing) {
      setHasMoved(true);
      const deltaX = mouseX - resizing.startX;
      const deltaY = mouseY - resizing.startY;

      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;
      let newPosX = resizing.startPosX;
      let newPosY = resizing.startPosY;

      switch (resizing.handle) {
        case 'e':
          newWidth = Math.max(30, resizing.startWidth + deltaX);
          break;
        case 'w':
          newWidth = Math.max(30, resizing.startWidth - deltaX);
          if (newPosX !== undefined) newPosX = resizing.startPosX! + (resizing.startWidth - newWidth);
          break;
        case 's':
          newHeight = Math.max(30, resizing.startHeight + deltaY);
          break;
        case 'n':
          newHeight = Math.max(30, resizing.startHeight - deltaY);
          if (newPosY !== undefined) newPosY = resizing.startPosY! + (resizing.startHeight - newHeight);
          break;
        case 'se':
          newWidth = Math.max(30, resizing.startWidth + deltaX);
          newHeight = Math.max(30, resizing.startHeight + deltaY);
          break;
        case 'sw':
          newWidth = Math.max(30, resizing.startWidth - deltaX);
          newHeight = Math.max(30, resizing.startHeight + deltaY);
          if (newPosX !== undefined) newPosX = resizing.startPosX! + (resizing.startWidth - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(30, resizing.startWidth + deltaX);
          newHeight = Math.max(30, resizing.startHeight - deltaY);
          if (newPosY !== undefined) newPosY = resizing.startPosY! + (resizing.startHeight - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(30, resizing.startWidth - deltaX);
          newHeight = Math.max(30, resizing.startHeight - deltaY);
          if (newPosX !== undefined) newPosX = resizing.startPosX! + (resizing.startWidth - newWidth);
          if (newPosY !== undefined) newPosY = resizing.startPosY! + (resizing.startHeight - newHeight);
          break;
      }

      setResizing({
        ...resizing,
        currentWidth: Math.round(newWidth),
        currentHeight: Math.round(newHeight),
        currentPosX: newPosX !== undefined ? Math.round(newPosX) : undefined,
        currentPosY: newPosY !== undefined ? Math.round(newPosY) : undefined,
      });
    }
  };

  const handleMouseUp = async () => {
    if (resizing && resizing.currentWidth !== undefined && resizing.currentHeight !== undefined) {
      const updates: any = {};

      if (resizing.type === 'element') {
        updates.width = resizing.currentWidth;
        updates.height = resizing.currentHeight;
        if (resizing.currentPosX !== undefined) updates.position_x = resizing.currentPosX;
        if (resizing.currentPosY !== undefined) updates.position_y = resizing.currentPosY;
        await supabase.from('map_elements').update(updates).eq('id', resizing.id);
        refetchElements();
      } else if (resizing.type === 'workstation') {
        updates.width_cm = resizing.currentWidth;
        updates.height_cm = resizing.currentHeight;
        if (resizing.currentPosX !== undefined) updates.position_x = resizing.currentPosX;
        if (resizing.currentPosY !== undefined) updates.position_y = resizing.currentPosY;
        await supabase.from('workstations').update(updates).eq('id', resizing.id);
        refetch();
      }
    }

    setDragging(null);
    setResizing(null);
    setIsPanning(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === mapRef.current || (e.target as HTMLElement).classList.contains('map-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning && !dragging && !resizing) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    item: MapElement | WorkstationWithDetails,
    type: 'element' | 'workstation',
    handle: ResizeState['handle']
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    const mouseX = (e.clientX - panOffset.x) / scale;
    const mouseY = (e.clientY - panOffset.y) / scale;

    setHasMoved(false);
    setIsPanning(false);
    let startWidth: number;
    let startHeight: number;
    let startPosX: number;
    let startPosY: number;

    if (type === 'workstation') {
      const ws = item as WorkstationWithDetails;
      startWidth = ws.width_cm || 120;
      startHeight = ws.height_cm || 55;
      startPosX = ws.position_x;
      startPosY = ws.position_y;
    } else {
      const el = item as MapElement;
      startWidth = el.width;
      startHeight = el.height;
      startPosX = el.position_x;
      startPosY = el.position_y;
    }

    setResizing({
      id: item.id,
      type,
      startX: mouseX,
      startY: mouseY,
      startWidth,
      startHeight,
      startPosX,
      startPosY,
      handle,
    });
  };

  const handleRotateWorkstation = async (ws: WorkstationWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    const newRotation = ((ws.rotation || 0) + 90) % 360;
    await supabase.from('workstations').update({ rotation: newRotation }).eq('id', ws.id);
    refetch();
  };

  const handleRotateElement = async (element: MapElement, e: React.MouseEvent) => {
    e.stopPropagation();
    const newRotation = ((element.rotation || 0) + 90) % 360;
    await supabase.from('map_elements').update({ rotation: newRotation }).eq('id', element.id);
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

  const handleAddElement = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await supabase.from('map_elements').insert({
      site_id: siteId,
      type: addingElementType,
      position_x: 100,
      position_y: 100,
      width: parseInt(formData.get('width') as string) || 100,
      height: parseInt(formData.get('height') as string) || 100,
      color: formData.get('color') as string,
      label: formData.get('label') as string || '',
      image_url: formData.get('image_url') as string || '',
      border_radius: parseInt(formData.get('border_radius') as string) || 0,
      rotation: 0,
    });
    refetchElements();
    setShowAddElement(false);
  };

  const handleUpdateElement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingElement) return;
    const formData = new FormData(e.target as HTMLFormElement);
    await supabase.from('map_elements').update({
      width: parseInt(formData.get('width') as string),
      height: parseInt(formData.get('height') as string),
      color: formData.get('color') as string,
      label: formData.get('label') as string,
      image_url: formData.get('image_url') as string || '',
      border_radius: parseInt(formData.get('border_radius') as string) || 0,
    }).eq('id', editingElement.id);
    refetchElements();
    setEditingElement(null);
    setSelectedElement(null);
  };

  const handleDeleteElement = async (id: string) => {
    await supabase.from('map_elements').delete().eq('id', id);
    refetchElements();
    setSelectedElement(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600 border-green-600';
      case 'assigned':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
      default:
        return 'bg-red-500 hover:bg-red-600 border-red-600';
    }
  };

  const getElementStyle = (element: MapElement) => {
    const baseStyle = {
      left: `${element.position_x}px`,
      top: `${element.position_y}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
      transform: `rotate(${element.rotation}deg)`,
      borderRadius: `${element.border_radius}px`,
    };

    if (element.type === 'label') {
      return { ...baseStyle, width: 'auto', height: 'auto' };
    }
    return baseStyle;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{siteName}</h2>
          <p className="text-sm text-gray-600 mt-1">{workstations.length} workstations</p>
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
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?readonly=true&site=${siteId}`;
              navigator.clipboard.writeText(url);
              alert('Read-only link copied to clipboard!');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => setShowAddElement(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Element
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-100 relative"
        onMouseUp={handleMouseUp}
        onMouseMove={handleCanvasMouseMove}
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
          className="relative map-background"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            width: '3000px',
            height: '3000px',
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            cursor: dragging || resizing ? 'grabbing' : isPanning ? 'grabbing' : 'default',
          }}
        >
          {filteredElements.map((element) => {
            const isResizingElement = resizing?.type === 'element' && resizing.id === element.id;
            const elementWidth = isResizingElement && resizing.currentWidth !== undefined ? resizing.currentWidth : element.width;
            const elementHeight = isResizingElement && resizing.currentHeight !== undefined ? resizing.currentHeight : element.height;
            const elementPosX = isResizingElement && resizing.currentPosX !== undefined ? resizing.currentPosX : element.position_x;
            const elementPosY = isResizingElement && resizing.currentPosY !== undefined ? resizing.currentPosY : element.position_y;

            const style = {
              left: `${elementPosX}px`,
              top: `${elementPosY}px`,
              width: element.type === 'label' ? 'auto' : `${elementWidth}px`,
              height: element.type === 'label' ? 'auto' : `${elementHeight}px`,
              transform: `rotate(${element.rotation}deg)`,
              borderRadius: `${element.border_radius}px`,
              backgroundColor: element.type === 'label' ? 'transparent' : element.type === 'icon' ? 'transparent' : element.color,
              backgroundImage: element.image_url && element.type === 'icon' ? `url(${element.image_url})` : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            };

            return (
            <div
              key={element.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (!resizing) {
                  handleMouseDown(e, 'element', element.id, element.position_x, element.position_y);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!dragging && !resizing && !hasMoved) {
                  setSelectedElement(element);
                }
              }}
              className={`absolute select-none ${
                element.type === 'label' ? 'bg-transparent border-none cursor-move' : 'border-2 shadow-lg cursor-move'
              } ${
                selectedElement?.id === element.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-400'
              }`}
              style={style}
            >
              {element.label && element.type !== 'icon' && (
                <div className={`${element.type === 'label' ? 'text-2xl font-bold text-gray-900' : 'text-xs text-center p-2 text-gray-700'} pointer-events-none`}>
                  {element.label}
                </div>
              )}

              {selectedElement?.id === element.id && element.type !== 'label' && (
                <>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleRotateElement(element, e)}
                    className="absolute -top-8 right-0 p-1 bg-white rounded shadow-lg hover:bg-gray-100 border border-gray-300"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'n'); }} className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-n-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 's'); }} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-s-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'e'); }} className="absolute top-1/2 -translate-y-1/2 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-e-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'w'); }} className="absolute top-1/2 -translate-y-1/2 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-w-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'se'); }} className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'sw'); }} className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-sw-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'ne'); }} className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ne-resize" />
                  <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element, 'element', 'nw'); }} className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize" />
                </>
              )}
            </div>
            );
          })}

          {filteredWorkstations.map((ws) => {
            const isResizing = resizing?.type === 'workstation' && resizing.id === ws.id;
            const widthPx = isResizing && resizing.currentWidth !== undefined ? resizing.currentWidth : (ws.width_cm || 120);
            const heightPx = isResizing && resizing.currentHeight !== undefined ? resizing.currentHeight : (ws.height_cm || 55);
            const posX = isResizing && resizing.currentPosX !== undefined ? resizing.currentPosX : ws.position_x;
            const posY = isResizing && resizing.currentPosY !== undefined ? resizing.currentPosY : ws.position_y;
            const isSelected = selectedWorkstation?.id === ws.id;
            const isHovered = hoveredWorkstation === ws.id;

            return (
              <div
                key={ws.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (!resizing) {
                    handleMouseDown(e, 'workstation', ws.id, ws.position_x, ws.position_y);
                  }
                }}
                onMouseEnter={() => setHoveredWorkstation(ws.id)}
                onMouseLeave={() => setHoveredWorkstation(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!dragging && !resizing && !hasMoved) {
                    setSelectedWorkstation(ws);
                  }
                }}
                className={`absolute select-none transition-shadow ${getStatusColor(ws.status)} text-white rounded-lg shadow-lg border-2 ${
                  isSelected ? 'ring-4 ring-yellow-300' : ''
                } ${!isSelected ? 'cursor-move' : ''}`}
                style={{
                  left: `${posX}px`,
                  top: `${posY}px`,
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

                {isHovered && !isSelected && (
                  <div className="absolute top-1/2 -translate-y-1/2 -left-48 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap pointer-events-none" style={{ zIndex: 9999 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="w-4 h-4" />
                      <span className="font-semibold">{ws.type || 'Workstation'}</span>
                    </div>
                    <div className="text-gray-300">{ws.width_cm}×{ws.height_cm} px</div>
                    <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}

                <div className="absolute -top-8 right-0 flex gap-1">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWorkstationSize(ws);
                    }}
                    className="p-1 bg-white text-gray-700 rounded shadow-lg hover:bg-gray-100"
                  >
                    <Ruler className="w-4 h-4" />
                  </button>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleRotateWorkstation(ws, e)}
                    className="p-1 bg-white text-gray-700 rounded shadow-lg hover:bg-gray-100"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {isSelected && (
                  <>
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'n'); }} className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-n-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 's'); }} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-s-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'e'); }} className="absolute top-1/2 -translate-y-1/2 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-e-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'w'); }} className="absolute top-1/2 -translate-y-1/2 -left-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-w-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'se'); }} className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-se-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'sw'); }} className="absolute -bottom-1 -left-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-sw-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'ne'); }} className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-ne-resize" />
                    <div onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, ws, 'workstation', 'nw'); }} className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-nw-resize" />
                  </>
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

      {selectedElement && !editingElement && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border-2 border-gray-300 p-4 z-40">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Element</h3>
            <button onClick={() => setSelectedElement(null)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Type:</span> {selectedElement.type}</p>
            <p><span className="font-medium">Size:</span> {selectedElement.width}×{selectedElement.height}</p>
            {selectedElement.label && <p><span className="font-medium">Label:</span> {selectedElement.label}</p>}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setEditingElement(selectedElement)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => handleDeleteElement(selectedElement.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      )}

      {editingWorkstationSize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Workstation Size</h2>
              <button onClick={() => setEditingWorkstationSize(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleUpdateWorkstationSize} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Width (px)</label>
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
                  <label className="text-sm font-medium block mb-1">Height (px)</label>
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
              <p className="text-xs text-gray-500">Standard desk size: 120 × 55 px</p>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setEditingWorkstationSize(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingElement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Edit Element</h2>
              <button onClick={() => setEditingElement(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleUpdateElement} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Width</label>
                  <input name="width" type="number" defaultValue={editingElement.width} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Height</label>
                  <input name="height" type="number" defaultValue={editingElement.height} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              {editingElement.type !== 'label' && editingElement.type !== 'icon' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Color</label>
                  <input name="color" type="color" defaultValue={editingElement.color} className="w-full h-10 border rounded-lg" />
                </div>
              )}
              {editingElement.type === 'icon' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Image URL</label>
                  <input name="image_url" type="url" defaultValue={editingElement.image_url} placeholder="https://example.com/image.png" className="w-full px-3 py-2 border rounded-lg" />
                  <p className="text-xs text-gray-500 mt-1">Enter a direct URL to a PNG image</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Label</label>
                <input name="label" type="text" defaultValue={editingElement.label} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              {editingElement.type !== 'label' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Border Radius</label>
                  <input name="border_radius" type="number" defaultValue={editingElement.border_radius || 0} min="0" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setEditingElement(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddElement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Add Map Element</h2>
              <button onClick={() => setShowAddElement(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleAddElement} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Element Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'box' as const, icon: Square, label: 'Box' },
                    { type: 'icon' as const, icon: Image, label: 'Icon/Image' },
                    { type: 'label' as const, icon: Type, label: 'Label' },
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
                  <label className="text-sm font-medium block mb-1">Width</label>
                  <input name="width" type="number" defaultValue={100} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Height</label>
                  <input name="height" type="number" defaultValue={100} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              {addingElementType !== 'label' && addingElementType !== 'icon' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Color</label>
                  <input name="color" type="color" defaultValue="#94a3b8" className="w-full h-10 border rounded-lg" />
                </div>
              )}
              {addingElementType === 'icon' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Image URL</label>
                  <input name="image_url" type="url" placeholder="https://example.com/image.png" className="w-full px-3 py-2 border rounded-lg" />
                  <p className="text-xs text-gray-500 mt-1">Enter a direct URL to a PNG or image file</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Label (Optional)</label>
                <input name="label" type="text" placeholder="Enter label text" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              {addingElementType !== 'label' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Border Radius</label>
                  <input name="border_radius" type="number" defaultValue={0} min="0" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setShowAddElement(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Element</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedWorkstation && (
        <WorkstationDetail workstation={selectedWorkstation} onClose={() => { setSelectedWorkstation(null); refetch(); }} />
      )}
    </div>
  );
}
