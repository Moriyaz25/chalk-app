"use client";

import {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { BOARD_VIEWBOX, type ChalkStroke } from "@/types/chalk";

type Point = { x: number; y: number };

type ChalkCanvasProps = {
  color: string;
  strokeWidth: number;
  boardColorHex: string;
  className?: string;
  onStrokesChange?: (count: number) => void;
};

export type ChalkCanvasHandle = {
  clear: () => void;
  undo: () => void;
  redo: () => void;
  getStrokes: () => ChalkStroke[];
  isEmpty: () => boolean;
};

// Converts a sequence of points into a smooth SVG path using quadratic
// midpoint smoothing — gives strokes a natural hand-drawn wobble instead of
// jagged polyline segments.
function pointsToPath(points: Point[]): string {
  if (points.length < 2) {
    const p = points[0];
    return p ? `M ${p.x} ${p.y} L ${p.x} ${p.y}` : "";
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    d += ` Q ${points[i].x} ${points[i].y} ${mid.x} ${mid.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const ChalkCanvas = forwardRef<ChalkCanvasHandle, ChalkCanvasProps>(
  function ChalkCanvas({ color, strokeWidth, boardColorHex, className, onStrokesChange }, ref) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [strokes, setStrokes] = useState<ChalkStroke[]>([]);
    const [, setRedoStack] = useState<ChalkStroke[]>([]);
    const currentPoints = useRef<Point[]>([]);
    const [liveStroke, setLiveStroke] = useState<ChalkStroke | null>(null);
    const drawing = useRef(false);
    const pointerId = useRef<number | null>(null);

    const toSvgPoint = useCallback((clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * BOARD_VIEWBOX.width;
      const y = ((clientY - rect.top) / rect.height) * BOARD_VIEWBOX.height;
      return { x, y };
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        e.preventDefault();
        drawing.current = true;
        pointerId.current = e.pointerId;
        const point = toSvgPoint(e.clientX, e.clientY);
        currentPoints.current = [point];
        setLiveStroke({ d: pointsToPath([point]), color, width: strokeWidth, opacity: 0.92 });
        setRedoStack([]);
      },
      [color, strokeWidth, toSvgPoint]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (!drawing.current || e.pointerId !== pointerId.current) return;
        e.preventDefault();
        const point = toSvgPoint(e.clientX, e.clientY);
        currentPoints.current.push(point);
        setLiveStroke({
          d: pointsToPath(currentPoints.current),
          color,
          width: strokeWidth,
          opacity: 0.92,
        });
      },
      [color, strokeWidth, toSvgPoint]
    );

    const updateStrokes = useCallback(
      (updater: (prev: ChalkStroke[]) => ChalkStroke[]) => {
        setStrokes((prev) => {
          const next = updater(prev);
          onStrokesChange?.(next.length);
          return next;
        });
      },
      [onStrokesChange]
    );

    const finishStroke = useCallback(() => {
      if (!drawing.current) return;
      drawing.current = false;
      pointerId.current = null;

      if (currentPoints.current.length > 0) {
        const finished: ChalkStroke = {
          d: pointsToPath(currentPoints.current),
          color,
          width: strokeWidth,
          opacity: 0.92,
        };
        updateStrokes((prev) => [...prev, finished]);
      }
      currentPoints.current = [];
      setLiveStroke(null);
    }, [color, strokeWidth, updateStrokes]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        setStrokes([]);
        setRedoStack([]);
        setLiveStroke(null);
        onStrokesChange?.(0);
      },
      undo: () => {
        setStrokes((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setRedoStack((r) => [...r, last]);
          const next = prev.slice(0, -1);
          onStrokesChange?.(next.length);
          return next;
        });
      },
      redo: () => {
        setRedoStack((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setStrokes((s) => {
            const next = [...s, last];
            onStrokesChange?.(next.length);
            return next;
          });
          return prev.slice(0, -1);
        });
      },
      getStrokes: () => strokes,
      isEmpty: () => strokes.length === 0,
    }));

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`}
        className={className}
        style={{ touchAction: "none", cursor: "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        onPointerCancel={finishStroke}
      >
        <rect width="100%" height="100%" fill={boardColorHex} opacity={0} />
        {strokes.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={stroke.opacity}
          />
        ))}
        {liveStroke && (
          <path
            d={liveStroke.d}
            stroke={liveStroke.color}
            strokeWidth={liveStroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={liveStroke.opacity}
          />
        )}
      </svg>
    );
  }
);
