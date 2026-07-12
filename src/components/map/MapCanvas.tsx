import { useRef, useEffect, useState, useCallback } from 'react';
import type { Camera } from '../../lib/camera';
import { screenToWorld, worldToScreen, fitContentToViewport, zoomAtPoint, clampScale } from '../../lib/camera';
import type { InteractionState, ResizeHandle } from '../../lib/mapInteraction';
import {
  createInitialState,
  startPan,
  startDrag,
  startResize,
  updatePan,
  updateDrag,
  updateResize,
  endInteraction,
  isClick,
} from '../../lib/mapInteraction';
import type { WorkstationWithDetails } from '../../lib/database.types';
import type { MapElement } from '../../hooks/useData';
import WorkstationRenderer from './WorkstationRenderer';
import ElementRenderer from './ElementRenderer';
import ZoomControls from './ZoomControls';

interface Props {
  workstations: WorkstationWithDetails[];
  elements: MapElement[];
  isReadOnly: boolean;
  onWorkstationClick?: (ws: WorkstationWithDetails) => void;
  onWorkstationDoubleClick?: (ws: WorkstationWithDetails) => void;
  onWorkstationMove?: (id: string, x: number, y: number) => void;
  onWorkstationResize?: (id: string, x: number, y: number, width: number, height: number) => void;
  onWorkstationRotate?: (id: string) => void;
  onWorkstationEditSize?: (ws: WorkstationWithDetails) => void;
  onElementClick?: (element: MapElement) => void;
  onElementDoubleClick?: (element: MapElement) => void;
  onElementMove?: (id: string, x: number, y: number) => void;
  onElementResize?: (id: string, x: number, y: number, width: number, height: number) => void;
  onElementRotate?: (id: string) => void;
}

export default function MapCanvas({
  workstations,
  elements,
  isReadOnly,
  onWorkstationClick,
  onWorkstationDoubleClick,
  onWorkstationMove,
  onWorkstationResize,
  onWorkstationRotate,
  onWorkstationEditSize,
  onElementClick,
  onElementDoubleClick,
  onElementMove,
  onElementResize,
  onElementRotate,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [interaction, setInteraction] = useState<InteractionState>(createInitialState());
  const [hoveredWorkstation, setHoveredWorkstation] = useState<string | null>(null);
  const [selectedWorkstation, setSelectedWorkstation] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [livePosition, setLivePosition] = useState<{ id: string; x: number; y: number } | null>(null);
  const [liveResize, setLiveResize] = useState<{ id: string; x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || (workstations.length === 0 && elements.length === 0)) return;

    const items = [
      ...workstations.map(ws => ({
        x: ws.position_x,
        y: ws.position_y,
        width: ws.width_cm || 120,
        height: ws.height_cm || 55,
      })),
      ...elements.map(el => ({
        x: el.position_x,
        y: el.position_y,
        width: el.width,
        height: el.height,
      })),
    ];

    const fittedCamera = fitContentToViewport(
      items,
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
      50
    );

    setCamera(fittedCamera);
  }, [workstations.length, elements.length]);


  const handleZoomIn = useCallback(() => {
    setCamera(prev => ({ ...prev, scale: clampScale(prev.scale + 0.2) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCamera(prev => ({ ...prev, scale: clampScale(prev.scale - 0.2) }));
  }, []);

  const handleFit = useCallback(() => {
    if (!containerRef.current || (workstations.length === 0 && elements.length === 0)) return;

    const items = [
      ...workstations.map(ws => ({
        x: ws.position_x,
        y: ws.position_y,
        width: ws.width_cm || 120,
        height: ws.height_cm || 55,
      })),
      ...elements.map(el => ({
        x: el.position_x,
        y: el.position_y,
        width: el.width,
        height: el.height,
      })),
    ];

    const fittedCamera = fitContentToViewport(
      items,
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
      50
    );

    setCamera(fittedCamera);
  }, [workstations, elements]);

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === canvasRef.current) {
      const rect = containerRef.current!.getBoundingClientRect();
      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const newState = startPan(interaction, screenPoint, camera);
      setInteraction(newState);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);

    if (interaction.mode === 'panning') {
      const result = updatePan(interaction, screenPoint);
      if (result) {
        setCamera(result.camera);
        setInteraction({ ...interaction, hasMoved: true });
      }
    } else if (interaction.mode === 'dragging') {
      const result = updateDrag(interaction, worldPoint);
      if (result) {
        setLivePosition({ id: interaction.drag!.itemId, x: result.x, y: result.y });
        setInteraction({ ...interaction, hasMoved: true });
      }
    } else if (interaction.mode === 'resizing') {
      const result = updateResize(interaction, worldPoint);
      if (result) {
        setLiveResize({ id: interaction.resize!.itemId, ...result });
        setInteraction({ ...interaction, hasMoved: true });
      }
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (interaction.mode === 'dragging' && livePosition) {
      if (interaction.drag!.itemType === 'workstation') {
        onWorkstationMove?.(livePosition.id, livePosition.x, livePosition.y);
      } else {
        onElementMove?.(livePosition.id, livePosition.x, livePosition.y);
      }
      setLivePosition(null);
    } else if (interaction.mode === 'resizing' && liveResize) {
      if (interaction.resize!.itemType === 'workstation') {
        onWorkstationResize?.(liveResize.id, liveResize.x, liveResize.y, liveResize.width, liveResize.height);
      } else {
        onElementResize?.(liveResize.id, liveResize.x, liveResize.y, liveResize.width, liveResize.height);
      }
      setLiveResize(null);
    }

    setInteraction(endInteraction(interaction));
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWorkstationPointerDown = (ws: WorkstationWithDetails, e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);
    const newState = startDrag(interaction, ws.id, 'workstation', worldPoint, { x: ws.position_x, y: ws.position_y });
    setInteraction(newState);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleWorkstationClick = (ws: WorkstationWithDetails, e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (isClick(interaction, screenPoint)) {
      setSelectedWorkstation(ws.id);
      setSelectedElement(null);
      onWorkstationClick?.(ws);
    }
  };

  const handleWorkstationDoubleClick = (ws: WorkstationWithDetails, e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onWorkstationDoubleClick?.(ws);
  };

  const handleWorkstationResizeDown = (ws: WorkstationWithDetails, e: React.PointerEvent, handle: ResizeHandle) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);
    const newState = startResize(
      interaction,
      ws.id,
      'workstation',
      handle,
      worldPoint,
      { x: ws.position_x, y: ws.position_y, width: ws.width_cm || 120, height: ws.height_cm || 55 }
    );
    setInteraction(newState);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleElementPointerDown = (element: MapElement, e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);
    const newState = startDrag(interaction, element.id, 'element', worldPoint, { x: element.position_x, y: element.position_y });
    setInteraction(newState);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleElementClick = (element: MapElement, e: React.PointerEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (isClick(interaction, screenPoint)) {
      setSelectedElement(element.id);
      setSelectedWorkstation(null);
      onElementClick?.(element);
    }
  };

  const handleElementDoubleClick = (element: MapElement, e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onElementDoubleClick?.(element);
  };

  const handleElementResizeDown = (element: MapElement, e: React.PointerEvent, handle: ResizeHandle) => {
    if (isReadOnly) return;
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);
    const newState = startResize(
      interaction,
      element.id,
      'element',
      handle,
      worldPoint,
      { x: element.position_x, y: element.position_y, width: element.width, height: element.height }
    );
    setInteraction(newState);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const getCursor = () => {
    if (interaction.mode === 'panning') return 'grabbing';
    if (!isReadOnly) {
      if (interaction.mode === 'dragging') return 'grabbing';
      if (interaction.mode === 'resizing') return 'grabbing';
    }
    return 'grab';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-100"
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
    >
      <ZoomControls
        scale={camera.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
      />

      <div
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={handleCanvasPointerDown}
        style={{
          transform: `translate(${-camera.x * camera.scale}px, ${-camera.y * camera.scale}px) scale(${camera.scale})`,
          transformOrigin: 'top left',
          width: '3000px',
          height: '3000px',
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          cursor: getCursor(),
        }}
      >
        {elements.map((element) => {
          const pos = livePosition?.id === element.id ? livePosition : { x: element.position_x, y: element.position_y };
          const resize = liveResize?.id === element.id ? liveResize : null;
          const adjustedElement = {
            ...element,
            position_x: pos.x,
            position_y: pos.y,
            width: resize?.width ?? element.width,
            height: resize?.height ?? element.height,
          };

          return (
            <ElementRenderer
              key={element.id}
              element={adjustedElement}
              isSelected={selectedElement === element.id}
              isReadOnly={isReadOnly}
              onPointerDown={(e) => handleElementPointerDown(element, e)}
              onClick={(e) => handleElementClick(element, e)}
              onDoubleClick={!isReadOnly ? (e) => handleElementDoubleClick(element, e) : undefined}
              onRotate={
                !isReadOnly && element.type !== 'label'
                  ? (e) => {
                      e.stopPropagation();
                      onElementRotate?.(element.id);
                    }
                  : undefined
              }
              onResizeHandleDown={
                !isReadOnly && element.type !== 'label'
                  ? (e, handle) => handleElementResizeDown(element, e, handle)
                  : undefined
              }
            />
          );
        })}

        {workstations.map((ws) => {
          const pos = livePosition?.id === ws.id ? livePosition : { x: ws.position_x, y: ws.position_y };
          const resize = liveResize?.id === ws.id ? liveResize : null;
          const adjustedWs = {
            ...ws,
            position_x: pos.x,
            position_y: pos.y,
            width_cm: resize?.width ?? (ws.width_cm || 120),
            height_cm: resize?.height ?? (ws.height_cm || 55),
          };

          const rect = containerRef.current?.getBoundingClientRect();
          let tooltipScreenPos: { x: number; y: number } | undefined;
          if (hoveredWorkstation === ws.id && rect) {
            const wsScreenPos = worldToScreen({ x: adjustedWs.position_x + (adjustedWs.width_cm || 120) / 2, y: adjustedWs.position_y }, camera);
            tooltipScreenPos = {
              x: rect.left + wsScreenPos.x,
              y: rect.top + wsScreenPos.y,
            };
          }

          return (
            <WorkstationRenderer
              key={ws.id}
              workstation={adjustedWs}
              isSelected={selectedWorkstation === ws.id}
              isHovered={hoveredWorkstation === ws.id}
              isReadOnly={isReadOnly}
              onPointerDown={(e) => handleWorkstationPointerDown(ws, e)}
              onPointerEnter={() => setHoveredWorkstation(ws.id)}
              onPointerLeave={() => setHoveredWorkstation(null)}
              onClick={(e) => handleWorkstationClick(ws, e)}
              onDoubleClick={!isReadOnly ? (e) => handleWorkstationDoubleClick(ws, e) : undefined}
              onRotate={
                !isReadOnly
                  ? (e) => {
                      e.stopPropagation();
                      onWorkstationRotate?.(ws.id);
                    }
                  : undefined
              }
              onEditSize={
                !isReadOnly
                  ? (e) => {
                      e.stopPropagation();
                      onWorkstationEditSize?.(ws);
                    }
                  : undefined
              }
              onResizeHandleDown={
                !isReadOnly
                  ? (e, handle) => handleWorkstationResizeDown(ws, e, handle)
                  : undefined
              }
              tooltipScreenPos={tooltipScreenPos}
            />
          );
        })}
      </div>
    </div>
  );
}
