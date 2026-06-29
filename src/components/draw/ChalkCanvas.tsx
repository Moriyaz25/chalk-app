"use client";

import {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useEffect,
} from "react";
import { BOARD_VIEWBOX, type ChalkStroke, type ChalkTextElement } from "@/types/chalk";

type Point = { x: number; y: number };
type ToolMode = "draw" | "text";

type ChalkCanvasProps = {
  color: string;
  strokeWidth: number;
  boardColorHex: string;
  mode?: ToolMode;
  textElements?: ChalkTextElement[];
  selectedTextId?: string | null;
  className?: string;
  onStrokesChange?: (count: number) => void;
  onSelectText?: (id: string | null) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
  initialStrokes?: ChalkStroke[];
};

export type ChalkCanvasHandle = {
  clear: () => void;
  undo: () => void;
  redo: () => void;
  getStrokes: () => ChalkStroke[];
  isEmpty: () => boolean;
  loadStrokes: (strokes: ChalkStroke[]) => void;
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

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export const ChalkCanvas = forwardRef<ChalkCanvasHandle, ChalkCanvasProps>(
  function ChalkCanvas(
    {
      color,
      strokeWidth,
      boardColorHex,
      mode = "draw",
      textElements = [],
      selectedTextId,
      className,
      onStrokesChange,
      onSelectText,
      onMoveText,
      initialStrokes = [],
    },
    ref
  ) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [strokes, setStrokes] = useState<ChalkStroke[]>(initialStrokes);
    const [, setRedoStack] = useState<ChalkStroke[]>([]);
    const currentPoints = useRef<Point[]>([]);
    const [liveStroke, setLiveStroke] = useState<ChalkStroke | null>(null);
    const liveStrokeFrame = useRef<number | null>(null);
    const drawing = useRef(false);
    const pointerId = useRef<number | null>(null);
    const draggingTextId = useRef<string | null>(null);
    const textDragOffset = useRef<Point>({ x: 0, y: 0 });

    const toSvgPoint = useCallback((clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const matrix = svg.getScreenCTM();
      if (!matrix) return { x: 0, y: 0 };
      const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
      return { x: point.x, y: point.y };
    }, []);

    const scheduleLiveStroke = useCallback(
      (width = strokeWidth) => {
        if (liveStrokeFrame.current !== null) return;
        liveStrokeFrame.current = window.requestAnimationFrame(() => {
          liveStrokeFrame.current = null;
          setLiveStroke({
            d: pointsToPath(currentPoints.current),
            color,
            width,
            opacity: 0.9,
          });
        });
      },
      [color, strokeWidth]
    );

    useEffect(() => {
      return () => {
        if (liveStrokeFrame.current !== null) {
          window.cancelAnimationFrame(liveStrokeFrame.current);
        }
      };
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        e.preventDefault();
        if (mode === "text") {
          onSelectText?.(null);
          return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        pointerId.current = e.pointerId;
        const point = toSvgPoint(e.clientX, e.clientY);
        currentPoints.current = [point];
        const pressureWidth = strokeWidth * (0.85 + (e.pressure || 0.5) * 0.3);
        setLiveStroke({ d: pointsToPath([point]), color, width: pressureWidth, opacity: 0.9 });
        setRedoStack([]);
      },
      [color, mode, onSelectText, strokeWidth, toSvgPoint]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (!drawing.current || e.pointerId !== pointerId.current) return;
        e.preventDefault();
        const events =
          typeof e.nativeEvent.getCoalescedEvents === "function"
            ? e.nativeEvent.getCoalescedEvents()
            : [e.nativeEvent];
        for (const event of events) {
          const point = toSvgPoint(event.clientX, event.clientY);
          const last = currentPoints.current[currentPoints.current.length - 1];
          if (!last || distance(last, point) > 1.8) {
            currentPoints.current.push(point);
          }
        }
        scheduleLiveStroke();
      },
      [scheduleLiveStroke, toSvgPoint]
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
      if (liveStrokeFrame.current !== null) {
        window.cancelAnimationFrame(liveStrokeFrame.current);
        liveStrokeFrame.current = null;
      }

      if (currentPoints.current.length > 0) {
        const finished: ChalkStroke = {
          d: pointsToPath(currentPoints.current),
          color,
          width: strokeWidth,
          opacity: 0.9,
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
      loadStrokes: (next) => {
        setStrokes(next);
        setRedoStack([]);
        onStrokesChange?.(next.length);
      },
    }));

    const handleTextPointerDown = useCallback(
      (e: React.PointerEvent<SVGGElement>, item: ChalkTextElement) => {
        if (mode !== "text") return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerId.current = e.pointerId;
        draggingTextId.current = item.id;
        const point = toSvgPoint(e.clientX, e.clientY);
        textDragOffset.current = { x: point.x - item.x, y: point.y - item.y };
        onSelectText?.(item.id);
      },
      [mode, onSelectText, toSvgPoint]
    );

    const handleTextPointerMove = useCallback(
      (e: React.PointerEvent<SVGGElement>) => {
        if (mode !== "text" || e.pointerId !== pointerId.current || !draggingTextId.current) return;
        e.preventDefault();
        e.stopPropagation();
        const point = toSvgPoint(e.clientX, e.clientY);
        onMoveText?.(
          draggingTextId.current,
          point.x - textDragOffset.current.x,
          point.y - textDragOffset.current.y
        );
      },
      [mode, onMoveText, toSvgPoint]
    );

    const finishTextDrag = useCallback((e: React.PointerEvent<SVGGElement>) => {
      if (e.pointerId !== pointerId.current) return;
      pointerId.current = null;
      draggingTextId.current = null;
    }, []);

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`}
        className={className}
        style={{ touchAction: "none", cursor: mode === "text" ? "default" : "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        onPointerCancel={finishStroke}
      >
        <defs>
          <pattern id="card-grain" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M0 8 H44 M0 26 H44 M9 0 V44 M31 0 V44" stroke="#ffffff" strokeOpacity="0.035" />
            <circle cx="11" cy="12" r="1.2" fill="#ffffff" opacity="0.045" />
            <circle cx="34" cy="29" r="1" fill="#000000" opacity="0.06" />
          </pattern>
          <filter id="chalk-dust">
            <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="2" seed="8" />
            <feDisplacementMap in="SourceGraphic" scale="0.65" />
          </filter>
          <filter id="soft-paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill={boardColorHex} opacity={0} />
        <rect width="100%" height="100%" fill="url(#card-grain)" opacity={1} />
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
            filter="url(#chalk-dust)"
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
            filter="url(#chalk-dust)"
          />
        )}
        {textElements.map((item) => {
          const selected = selectedTextId === item.id;
          const estimatedWidth = Math.max(80, item.text.length * item.fontSize * 0.52);
          const estimatedHeight = item.fontSize * 1.35;

          return (
            <g
              key={item.id}
              transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
              onPointerDown={(e) => handleTextPointerDown(e, item)}
              onPointerMove={handleTextPointerMove}
              onPointerUp={finishTextDrag}
              onPointerCancel={finishTextDrag}
              className={mode === "text" ? "cursor-move" : "pointer-events-none"}
            >
              {item.backgroundColor !== "transparent" && (
                <rect
                  x={-estimatedWidth / 2 - 14}
                  y={-estimatedHeight + 4}
                  width={estimatedWidth + 28}
                  height={estimatedHeight + 12}
                  rx={10}
                  fill={item.backgroundColor}
                  opacity={0.88}
                  filter="url(#soft-paper-shadow)"
                />
              )}
              {selected && (
                <rect
                  x={-estimatedWidth / 2 - 18}
                  y={-estimatedHeight}
                  width={estimatedWidth + 36}
                  height={estimatedHeight + 20}
                  rx={12}
                  fill="none"
                  stroke="#f1c36f"
                  strokeDasharray="8 6"
                  strokeWidth={2}
                />
              )}
              <text
                textAnchor="middle"
                fontFamily={item.fontFamily}
                fontSize={item.fontSize}
                fontWeight={item.fontFamily.includes("Impact") ? 700 : 600}
                fill={item.color}
                stroke={item.outlineColor}
                strokeWidth={item.outlineWidth}
                paintOrder="stroke fill"
                filter="url(#chalk-dust)"
              >
                {item.text}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }
);
