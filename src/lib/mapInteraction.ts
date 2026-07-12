import type { Point, Camera } from './camera';

export type InteractionMode = 'idle' | 'panning' | 'dragging' | 'resizing';

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface DragState {
  itemId: string;
  itemType: 'workstation' | 'element';
  startWorld: Point;
  startItemPos: Point;
}

export interface ResizeState {
  itemId: string;
  itemType: 'workstation' | 'element';
  handle: ResizeHandle;
  startWorld: Point;
  startRect: { x: number; y: number; width: number; height: number };
}

export interface PanState {
  startScreen: Point;
  startCamera: Camera;
}

export interface InteractionState {
  mode: InteractionMode;
  drag?: DragState;
  resize?: ResizeState;
  pan?: PanState;
  pointerDownPos?: Point;
  hasMoved: boolean;
}

const CLICK_THRESHOLD = 5;

export function createInitialState(): InteractionState {
  return {
    mode: 'idle',
    hasMoved: false,
  };
}

export function isClick(state: InteractionState, currentPos: Point): boolean {
  if (!state.pointerDownPos) return false;
  const dx = currentPos.x - state.pointerDownPos.x;
  const dy = currentPos.y - state.pointerDownPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < CLICK_THRESHOLD;
}

export function startPan(state: InteractionState, screenPos: Point, camera: Camera): InteractionState {
  return {
    ...state,
    mode: 'panning',
    pan: {
      startScreen: screenPos,
      startCamera: { ...camera },
    },
    pointerDownPos: screenPos,
    hasMoved: false,
  };
}

export function startDrag(
  state: InteractionState,
  itemId: string,
  itemType: 'workstation' | 'element',
  worldPos: Point,
  itemPos: Point
): InteractionState {
  return {
    ...state,
    mode: 'dragging',
    drag: {
      itemId,
      itemType,
      startWorld: worldPos,
      startItemPos: itemPos,
    },
    pointerDownPos: worldPos,
    hasMoved: false,
  };
}

export function startResize(
  state: InteractionState,
  itemId: string,
  itemType: 'workstation' | 'element',
  handle: ResizeHandle,
  worldPos: Point,
  rect: { x: number; y: number; width: number; height: number }
): InteractionState {
  return {
    ...state,
    mode: 'resizing',
    resize: {
      itemId,
      itemType,
      handle,
      startWorld: worldPos,
      startRect: { ...rect },
    },
    pointerDownPos: worldPos,
    hasMoved: false,
  };
}

export function updatePan(state: InteractionState, screenPos: Point): { camera: Camera } | null {
  if (state.mode !== 'panning' || !state.pan) return null;

  const dx = screenPos.x - state.pan.startScreen.x;
  const dy = screenPos.y - state.pan.startScreen.y;

  const newCamera = {
    x: state.pan.startCamera.x - dx / state.pan.startCamera.scale,
    y: state.pan.startCamera.y - dy / state.pan.startCamera.scale,
    scale: state.pan.startCamera.scale,
  };

  return { camera: newCamera };
}

export function updateDrag(state: InteractionState, worldPos: Point): { x: number; y: number } | null {
  if (state.mode !== 'dragging' || !state.drag) return null;

  const dx = worldPos.x - state.drag.startWorld.x;
  const dy = worldPos.y - state.drag.startWorld.y;

  return {
    x: Math.max(0, Math.round(state.drag.startItemPos.x + dx)),
    y: Math.max(0, Math.round(state.drag.startItemPos.y + dy)),
  };
}

export function updateResize(
  state: InteractionState,
  worldPos: Point
): { x: number; y: number; width: number; height: number } | null {
  if (state.mode !== 'resizing' || !state.resize) return null;

  const dx = worldPos.x - state.resize.startWorld.x;
  const dy = worldPos.y - state.resize.startWorld.y;
  const { startRect, handle } = state.resize;

  let x = startRect.x;
  let y = startRect.y;
  let width = startRect.width;
  let height = startRect.height;

  switch (handle) {
    case 'e':
      width = Math.max(30, startRect.width + dx);
      break;
    case 'w':
      width = Math.max(30, startRect.width - dx);
      x = startRect.x + (startRect.width - width);
      break;
    case 's':
      height = Math.max(30, startRect.height + dy);
      break;
    case 'n':
      height = Math.max(30, startRect.height - dy);
      y = startRect.y + (startRect.height - height);
      break;
    case 'se':
      width = Math.max(30, startRect.width + dx);
      height = Math.max(30, startRect.height + dy);
      break;
    case 'sw':
      width = Math.max(30, startRect.width - dx);
      height = Math.max(30, startRect.height + dy);
      x = startRect.x + (startRect.width - width);
      break;
    case 'ne':
      width = Math.max(30, startRect.width + dx);
      height = Math.max(30, startRect.height - dy);
      y = startRect.y + (startRect.height - height);
      break;
    case 'nw':
      width = Math.max(30, startRect.width - dx);
      height = Math.max(30, startRect.height - dy);
      x = startRect.x + (startRect.width - width);
      y = startRect.y + (startRect.height - height);
      break;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function endInteraction(state: InteractionState): InteractionState {
  return createInitialState();
}

export function getCursorForHandle(handle: ResizeHandle): string {
  const cursors: Record<ResizeHandle, string> = {
    n: 'n-resize',
    s: 's-resize',
    e: 'e-resize',
    w: 'w-resize',
    ne: 'ne-resize',
    nw: 'nw-resize',
    se: 'se-resize',
    sw: 'sw-resize',
  };
  return cursors[handle];
}
