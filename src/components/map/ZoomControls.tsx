import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export default function ZoomControls({ scale, onZoomIn, onZoomOut, onFit }: Props) {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2" style={{ zIndex: 1000 }}>
      <button
        onClick={onZoomIn}
        className="p-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 shadow-lg transition-all hover:shadow-xl"
        type="button"
        title="Zoom In"
      >
        <ZoomIn className="w-6 h-6 text-gray-700" />
      </button>
      <button
        onClick={onZoomOut}
        className="p-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 shadow-lg transition-all hover:shadow-xl"
        type="button"
        title="Zoom Out"
      >
        <ZoomOut className="w-6 h-6 text-gray-700" />
      </button>
      <button
        onClick={onFit}
        className="p-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 shadow-lg transition-all hover:shadow-xl"
        type="button"
        title="Fit to View"
      >
        <Maximize2 className="w-6 h-6 text-gray-700" />
      </button>
      <div className="text-center text-xs bg-white border-2 border-gray-300 rounded-lg px-2 py-1 shadow-lg font-medium">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
