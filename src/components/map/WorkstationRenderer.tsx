import { createPortal } from 'react-dom';
import { Monitor, RotateCw, Ruler } from 'lucide-react';
import type { WorkstationWithDetails } from '../../lib/database.types';
import type { ResizeHandle } from '../../lib/mapInteraction';

interface Props {
  workstation: WorkstationWithDetails;
  isSelected: boolean;
  isHovered: boolean;
  isReadOnly: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClick: (e: React.PointerEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onRotate?: (e: React.MouseEvent) => void;
  onEditSize?: (e: React.MouseEvent) => void;
  onResizeHandleDown?: (e: React.PointerEvent, handle: ResizeHandle) => void;
  tooltipScreenPos?: { x: number; y: number };
}

export default function WorkstationRenderer({
  workstation: ws,
  isSelected,
  isHovered,
  isReadOnly,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onClick,
  onDoubleClick,
  onRotate,
  onEditSize,
  onResizeHandleDown,
  tooltipScreenPos,
}: Props) {
  const width = ws.width_cm || 120;
  const height = ws.height_cm || 55;

  const isVertical = height > width;

  const getStatusColor = () => {
    switch (ws.status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600 border-green-600';
      case 'assigned':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
      case 'maintenance':
        return 'bg-red-500 hover:bg-red-600 border-red-600';
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600';
      case 'unavailable':
        return 'bg-gray-500 hover:bg-gray-600 border-gray-600';
      case 'out_of_service':
        return 'bg-orange-500 hover:bg-orange-600 border-orange-600';
      default:
        return 'bg-gray-400 hover:bg-gray-500 border-gray-500';
    }
  };

  const resizeHandles: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <>
      <div
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={`absolute select-none transition-shadow ${getStatusColor()} text-white rounded-lg shadow-lg border-2 ${
          isSelected ? 'ring-4 ring-yellow-300' : ''
        } ${!isReadOnly ? 'cursor-move' : ''}`}
        style={{
          left: `${ws.position_x}px`,
          top: `${ws.position_y}px`,
          width: `${width}px`,
          height: `${height}px`,
          transform: `rotate(${ws.rotation || 0}deg)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px',
        }}
      >
        <div
          className="text-center pointer-events-none"
          style={{
            transform: isVertical ? 'rotate(-90deg)' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-bold text-sm">{ws.asset_tag || 'No Tag'}</div>
        </div>

        {!isReadOnly && isSelected && (
          <>
            <div className="absolute -top-10 right-0 flex gap-1">
              {onEditSize && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onEditSize}
                  className="p-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-100 border border-gray-200"
                  title="Edit size"
                >
                  <Ruler className="w-4 h-4" />
                </button>
              )}
              {onRotate && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onRotate}
                  className="p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {onResizeHandleDown && resizeHandles.map((handle) => {
              const positionClass = {
                n: 'absolute -top-1 left-1/2 -translate-x-1/2',
                s: 'absolute -bottom-1 left-1/2 -translate-x-1/2',
                e: 'absolute top-1/2 -translate-y-1/2 -right-1',
                w: 'absolute top-1/2 -translate-y-1/2 -left-1',
                ne: 'absolute -top-1 -right-1',
                nw: 'absolute -top-1 -left-1',
                se: 'absolute -bottom-1 -right-1',
                sw: 'absolute -bottom-1 -left-1',
              };

              const cursorClass = {
                n: 'cursor-n-resize',
                s: 'cursor-s-resize',
                e: 'cursor-e-resize',
                w: 'cursor-w-resize',
                ne: 'cursor-ne-resize',
                nw: 'cursor-nw-resize',
                se: 'cursor-se-resize',
                sw: 'cursor-sw-resize',
              };

              return (
                <div
                  key={handle}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeHandleDown(e, handle);
                  }}
                  className={`${positionClass[handle]} w-4 h-4 bg-yellow-400 border-2 border-white rounded-full shadow-lg ${cursorClass[handle]} hover:bg-yellow-500 hover:scale-110 transition-transform`}
                />
              );
            })}
          </>
        )}
      </div>

      {isHovered && !isSelected && tooltipScreenPos && createPortal(
        <div
          className="fixed bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap pointer-events-none"
          style={{
            left: `${tooltipScreenPos.x}px`,
            top: `${tooltipScreenPos.y}px`,
            zIndex: 10000,
            transform: 'translate(-50%, -100%) translateY(-8px)',
          }}
        >
          {ws.employees && (
            <div className="font-semibold mb-1">
              {ws.employees.name}
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-300">
            <Monitor className="w-3 h-3" />
            <span>{ws.workstation_types?.name || 'Workstation'}</span>
          </div>
          {!ws.employees && (
            <div className="text-gray-400 text-xs mt-1">Sin asignar</div>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 rotate-45"
          />
        </div>,
        document.body
      )}
    </>
  );
}
