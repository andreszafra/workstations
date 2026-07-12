import { RotateCw } from 'lucide-react';
import type { MapElement } from '../../hooks/useData';
import type { ResizeHandle } from '../../lib/mapInteraction';

interface Props {
  element: MapElement;
  isSelected: boolean;
  isReadOnly: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.PointerEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onRotate?: (e: React.MouseEvent) => void;
  onResizeHandleDown?: (e: React.PointerEvent, handle: ResizeHandle) => void;
}

export default function ElementRenderer({
  element,
  isSelected,
  isReadOnly,
  onPointerDown,
  onClick,
  onDoubleClick,
  onRotate,
  onResizeHandleDown,
}: Props) {
  const style: React.CSSProperties = {
    left: `${element.position_x}px`,
    top: `${element.position_y}px`,
    width: element.type === 'label' ? 'auto' : `${element.width}px`,
    height: element.type === 'label' ? 'auto' : `${element.height}px`,
    transform: `rotate(${element.rotation || 0}deg)`,
    borderWidth: element.type === 'label' ? '0' : `${element.border_width || 2}px`,
    borderColor: element.type === 'label' ? 'transparent' : (element.border_color || '#000000'),
    backgroundColor: element.type === 'label' ? 'transparent' : element.type === 'icon' ? 'transparent' : element.color,
    backgroundImage: element.image_url && element.type === 'icon' ? `url(${element.image_url})` : 'none',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };

  const resizeHandles: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`absolute select-none ${
        element.type === 'label' ? 'bg-transparent border-none cursor-move' : `border-solid ${element.has_shadow !== false ? 'shadow-lg' : ''} cursor-move`
      } ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      }`}
      style={style}
    >
      {element.label && element.type !== 'icon' && (
        <div className={`${element.type === 'label' ? 'text-2xl font-bold text-gray-900' : 'text-xs text-center p-2 text-gray-700'} pointer-events-none`}>
          {element.label}
        </div>
      )}

      {!isReadOnly && isSelected && element.type !== 'label' && (
        <>
          {onRotate && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onRotate}
              className="absolute -top-10 right-0 p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

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
                className={`${positionClass[handle]} w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg ${cursorClass[handle]} hover:bg-blue-700 hover:scale-110 transition-transform`}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
