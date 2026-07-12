import { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasStateResponse, CanvasPixel } from '../../shared/api';
import { CANVAS_PALETTE } from '../../shared/constants';

const CANVAS_SIZE = 16;

type Props = {
  canvasState: CanvasStateResponse | null;
  onPlacePixel: (x: number, y: number, color: string) => Promise<boolean>;
};

export const DailyCanvasSection = ({ canvasState, onPlacePixel }: Props) => {
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [pixels, setPixels] = useState<CanvasPixel[]>(canvasState?.pixels ?? []);
  const [userPixel, setUserPixel] = useState<CanvasPixel | null>(canvasState?.userPixel ?? null);
  const [totalPlaced, setTotalPlaced] = useState(canvasState?.totalPlaced ?? 0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitiallyPlaced = useRef(!!canvasState?.userPixel);

  // Sync props → state when canvasState arrives after mount (community unlock)
  useEffect(() => {
    if (canvasState) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPixels(canvasState.pixels);
      setUserPixel(canvasState.userPixel);
      setTotalPlaced(canvasState.totalPlaced);
      /* eslint-enable react-hooks/set-state-in-effect */
      if (canvasState.userPixel) hasInitiallyPlaced.current = true;
    }
  }, [canvasState]);

  useEffect(() => {
    if (!hasInitiallyPlaced.current) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/canvas');
          if (res.ok) {
            const data: CanvasStateResponse = await res.json();
            setPixels(data.pixels);
            setTotalPlaced(data.totalPlaced);
          }
          // eslint-disable-next-line no-empty
        } catch {}
      }, 8000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const pixelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pixels) {
      m.set(`${p.x},${p.y}`, p.color);
    }
    return m;
  }, [pixels]);

  const handleCellClick = (x: number, y: number) => {
    if (userPixel || placed || hasInitiallyPlaced.current) return;
    setSelectedCell(prev => (prev?.x === x && prev?.y === y) ? null : { x, y });
  };

  const handlePlace = async () => {
    if (!selectedCell || placing || userPixel || placed) return;
    setPlacing(true);
    const ok = await onPlacePixel(selectedCell.x, selectedCell.y, selectedColor);
    if (ok) {
      setPlaced(true);
      setUserPixel({ x: selectedCell.x, y: selectedCell.y, color: selectedColor });
      setTotalPlaced(prev => prev + 1);
      setSelectedCell(null);
      if (pollRef.current) clearInterval(pollRef.current);
    }
    setPlacing(false);
  };

  const hasPlaced = !!userPixel || placed;

  if (!canvasState) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
        <h3 className="font-bold text-amber-900 mb-1">Daily Canvas</h3>
        <div className="animate-pulse flex items-center gap-2 py-4">
          <div className="w-32 h-32 bg-amber-100 rounded-lg" />
          <span className="text-sm text-amber-400">Loading canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-amber-900">Daily Canvas</h3>
        <span className="text-xs text-amber-500">{totalPlaced} pixel{totalPlaced !== 1 ? 's' : ''} placed</span>
      </div>
      <p className="text-xs text-amber-600 mb-3">
        {hasPlaced
          ? `You placed pixel at (${userPixel?.x}, ${userPixel?.y})`
          : 'Tap a cell, pick a color, place your pixel'}
      </p>

      <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)`, maxWidth: '320px' }}>
        {Array.from({ length: CANVAS_SIZE * CANVAS_SIZE }).map((_, i) => {
          const x = i % CANVAS_SIZE;
          const y = Math.floor(i / CANVAS_SIZE);
          const key = `${x},${y}`;
          const color = pixelMap.get(key);
          const isSelected = selectedCell?.x === x && selectedCell?.y === y;
          const isUserPixel = userPixel?.x === x && userPixel?.y === y;

          return (
            <button
              key={key}
              onClick={() => handleCellClick(x, y)}
              className={`aspect-square rounded-sm transition-all ${
                isSelected ? 'ring-2 ring-offset-1 ring-amber-500 scale-110 z-10' : ''
              } ${isUserPixel ? 'ring-2 ring-amber-400 animate-pulse-glow' : ''}`}
              style={{
                backgroundColor: color ?? '#f5f0e8',
                cursor: hasPlaced ? 'default' : 'pointer',
              }}
              title={`(${x}, ${y})`}
            />
          );
        })}
      </div>

      {!hasPlaced && selectedCell && (
        <div className="mt-3 pt-3 border-t border-amber-100">
          <p className="text-xs text-amber-700 mb-2 text-center">Pick a color</p>
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {CANVAS_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  selectedColor === c ? 'border-amber-600 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCell(null)}
              className="flex-1 text-sm text-gray-500 py-1.5 rounded-lg border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handlePlace}
              disabled={placing}
              className="flex-1 text-sm font-medium text-white py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {placing ? 'Placing...' : `Place at (${selectedCell.x}, ${selectedCell.y})`}
            </button>
          </div>
        </div>
      )}

      {hasPlaced && (
        <div className="mt-2 text-center">
          <span className="text-xs text-amber-400">Come back tomorrow for a new pixel!</span>
        </div>
      )}
    </div>
  );
};
