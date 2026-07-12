# Floor Plan Module Architecture

## Why This Won't Break Again

This document explains the architectural decisions made to prevent the recurring issues that plagued the previous implementation.

## 1. Camera & Coordinate System

### Problem Before
- Random offsets and conversions scattered throughout the code
- Mixed coordinate systems causing drift during zoom/pan
- No clear separation between world and screen coordinates

### Solution Now
**Single Source of Truth:** `/src/lib/camera.ts`

```typescript
interface Camera {
  x: number;  // World X offset (not screen pixels)
  y: number;  // World Y offset (not screen pixels)
  scale: number;  // Zoom level (0.1 to 3.0)
}
```

**Two Coordinate Systems:**
- **WORLD**: Coordinates stored in database (position_x, position_y, width, height)
- **SCREEN**: Coordinates in the viewport (clientX, clientY)

**Conversion Layer:**
- `worldToScreen(point, camera)` - Converts DB coordinates to screen pixels
- `screenToWorld(point, camera)` - Converts mouse position to world coordinates

**Cursor-Anchored Zoom:**
- `zoomAtPoint()` ensures the point under the cursor stays fixed during zoom
- No drift or jumping

## 2. Interaction State Machine

### Problem Before
- Multiple boolean flags (`isPanning`, `isDragging`, `isResizing`) could conflict
- No clear distinction between click and drag
- Event handlers didn't properly stop propagation

### Solution Now
**Centralized State:** `/src/lib/mapInteraction.ts`

```typescript
type InteractionMode = 'idle' | 'panning' | 'dragging' | 'resizing';

interface InteractionState {
  mode: InteractionMode;  // Only ONE mode at a time
  drag?: DragState;
  resize?: ResizeState;
  pan?: PanState;
  hasMoved: boolean;  // Track if pointer moved beyond threshold
}
```

**Click vs Drag Threshold:**
- `CLICK_THRESHOLD = 5px`
- `isClick()` function determines if movement was below threshold
- Only opens workstation details on true click (not drag)

**State Transitions:**
- `startPan()` → `mode: 'panning'`
- `startDrag()` → `mode: 'dragging'`
- `startResize()` → `mode: 'resizing'`
- `endInteraction()` → `mode: 'idle'`

## 3. Pointer Events & Capture

### Problem Before
- Mixed mouse and touch handling
- Resize handles triggered pan/zoom
- Lost pointer tracking during fast movements

### Solution Now
**Pointer Events API:**
- Single event model for mouse, touch, and pen
- `setPointerCapture()` ensures we receive all events even if pointer leaves element
- `stopPropagation()` on resize handles prevents background pan

**Event Flow:**
```
Background click → startPan()
Workstation pointerDown → startDrag()
Resize handle pointerDown → startResize() + stopPropagation()
```

## 4. Floor Isolation

### Problem Before
- Elements from different floors could affect each other
- Floor filter applied inconsistently
- Schema didn't enforce floor constraints

### Solution Now
**Strict Filtering:**
```typescript
const filteredWorkstations = workstations.filter(ws => (ws.floor || 0) === selectedFloor);
const filteredElements = elements.filter(el => (el.floor || 0) === selectedFloor);
```

**Only filtered items passed to MapCanvas:**
- MapCanvas receives only current floor's data
- No cross-floor references possible
- Each floor is completely independent

## 5. Zoom Controls

### Problem Before
- Duplicate zoom controls in multiple places
- Wheel zoom scrolled the page
- Buttons didn't update properly

### Solution Now
**Single ZoomControls Component:**
- Located at `/src/components/map/ZoomControls.tsx`
- Always positioned bottom-right with `position: absolute; zIndex: 1000`
- Shows current zoom percentage

**Wheel Zoom:**
```typescript
// Non-passive listener to prevent page scroll
container.addEventListener('wheel', handleWheel, { passive: false });

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();  // Critical: stops page scroll
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newCamera = zoomAtPoint(camera, screenPoint, delta);
  setCamera(newCamera);
};
```

## 6. Tooltip Rendering

### Problem Before
- Tooltips rendered inside workstation divs
- Got clipped or appeared behind other elements
- Z-index battles

### Solution Now
**Portal to document.body:**
```typescript
{isHovered && createPortal(
  <div style={{ position: 'fixed', zIndex: 10000 }}>
    {/* Tooltip content */}
  </div>,
  document.body
)}
```

**Benefits:**
- Always renders on top
- No z-index conflicts
- No parent clipping

## 7. Live Visual Feedback

### Problem Before
- DB updates during drag caused lag and flickering
- Resize handles jumped around

### Solution Now
**Optimistic Updates:**
```typescript
const [livePosition, setLivePosition] = useState<{id, x, y} | null>(null);
const [liveResize, setLiveResize] = useState<{id, x, y, width, height} | null>(null);
```

**Flow:**
1. PointerMove: Update local state immediately
2. Visual: Render with live values
3. PointerUp: Persist to database once
4. Clear: Reset live state

## 8. Database Persistence

### Problem Before
- Updates on every pointer move (dozens per second)
- Race conditions
- Inconsistent state

### Solution Now
**Batch Updates:**
- Only update DB on `pointerUp`
- Single transaction per drag/resize
- Immediate refetch after update

```typescript
handleCanvasPointerUp = async () => {
  if (livePosition) {
    await supabase.update({
      position_x: livePosition.x,
      position_y: livePosition.y
    });
    refetch();
  }
};
```

## 9. Component Structure

### Clean Separation of Concerns

```
MapCanvas (orchestrator)
├── Camera utilities (math)
├── Interaction controller (state)
├── ZoomControls (UI)
├── WorkstationRenderer[] (rendering)
└── ElementRenderer[] (rendering)
```

**MapCanvas responsibilities:**
- Manage camera state
- Handle pointer events
- Coordinate updates
- Pass filtered data to renderers

**Renderer responsibilities:**
- Pure rendering only
- Receive props
- Fire callbacks
- No state management

## 10. Read-Only Mode

### Problem Before
- Read-only checks scattered everywhere
- Could still accidentally trigger updates

### Solution Now
**Single isReadOnly Prop:**
- Passed from top level
- MapCanvas respects it
- Renderers hide interactive elements
- No event handlers attached when `isReadOnly === true`

```typescript
const handleCanvasPointerDown = (e: React.PointerEvent) => {
  if (isReadOnly) return;  // Early exit
  // ... rest of handler
};
```

## Testing Strategy

To verify this implementation works:

1. **Zoom Test:**
   - Scroll wheel should zoom in/out smoothly
   - Page should NOT scroll
   - Cursor position should stay fixed
   - Buttons should work

2. **Pan Test:**
   - Click-drag background should pan
   - Clicking workstation should NOT pan
   - Cursor should show grab/grabbing

3. **Drag Test:**
   - Drag workstation should move it
   - Small movement (<5px) should open details
   - Large movement should just move

4. **Resize Test:**
   - Resize handles should NOT trigger pan
   - Should resize smoothly
   - Updates only on release

5. **Floor Isolation Test:**
   - Switch floors
   - Edit elements on Floor 1
   - Switch to Floor 2
   - Verify Floor 2 unchanged

6. **Tooltip Test:**
   - Hover workstation
   - Tooltip appears above everything
   - Never clipped or behind

## Key Files

- `/src/lib/camera.ts` - Coordinate transformations
- `/src/lib/mapInteraction.ts` - Interaction state machine
- `/src/components/map/MapCanvas.tsx` - Main orchestrator
- `/src/components/map/ZoomControls.tsx` - Zoom UI
- `/src/components/map/WorkstationRenderer.tsx` - Workstation rendering
- `/src/components/map/ElementRenderer.tsx` - Element rendering
- `/src/components/SiteMap.tsx` - Editable map page
- `/src/components/ReadOnlyMapView.tsx` - Read-only map page

## What NOT to Do

1. **DON'T** add offset calculations in random places
2. **DON'T** mix coordinate systems
3. **DON'T** update database during pointer move
4. **DON'T** skip `stopPropagation()` on resize handles
5. **DON'T** render tooltips inside workstation elements
6. **DON'T** allow multiple interaction modes simultaneously
7. **DON'T** forget the click threshold
8. **DON'T** pass unfiltered data to MapCanvas

## Summary

This architecture succeeds because:
- **Single source of truth** for coordinates (camera.ts)
- **State machine** prevents conflicting interactions
- **Pointer capture** ensures reliable tracking
- **Floor filtering** happens early and consistently
- **Portal rendering** solves z-index issues
- **Optimistic updates** provide smooth UX
- **Batch persistence** reduces DB load
- **Clear separation** of rendering and logic
