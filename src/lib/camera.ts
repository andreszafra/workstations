export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function worldToScreen(point: Point, camera: Camera): Point {
  return {
    x: (point.x - camera.x) * camera.scale,
    y: (point.y - camera.y) * camera.scale,
  };
}

export function screenToWorld(point: Point, camera: Camera): Point {
  return {
    x: point.x / camera.scale + camera.x,
    y: point.y / camera.scale + camera.y,
  };
}

export function getContentBounds(items: Rect[]): Bounds | null {
  if (items.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  items.forEach(item => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  });

  return { minX, minY, maxX, maxY };
}

export function fitContentToViewport(
  items: Rect[],
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50
): Camera {
  const bounds = getContentBounds(items);

  if (!bounds) {
    return { x: 0, y: 0, scale: 1 };
  }

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  const scaleX = (viewportWidth - padding * 2) / contentWidth;
  const scaleY = (viewportHeight - padding * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  const x = bounds.minX - padding / scale;
  const y = bounds.minY - padding / scale;

  return { x, y, scale };
}

export function clampScale(scale: number, min: number = 0.1, max: number = 3): number {
  return Math.max(min, Math.min(max, scale));
}

export function zoomAtPoint(
  camera: Camera,
  screenPoint: Point,
  deltaScale: number,
  minScale: number = 0.1,
  maxScale: number = 3
): Camera {
  const worldPoint = screenToWorld(screenPoint, camera);
  const newScale = clampScale(camera.scale + deltaScale, minScale, maxScale);

  if (newScale === camera.scale) return camera;

  const newCamera = { ...camera, scale: newScale };
  const newScreenPoint = worldToScreen(worldPoint, newCamera);

  return {
    x: camera.x + (newScreenPoint.x - screenPoint.x) / newScale,
    y: camera.y + (newScreenPoint.y - screenPoint.y) / newScale,
    scale: newScale,
  };
}
