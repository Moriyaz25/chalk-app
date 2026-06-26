"use client";

import { useEffect, useRef } from "react";
import { BOARD_VIEWBOX, type ChalkDrawing } from "@/types/chalk";

type BoardPlaybackProps = {
  drawing: ChalkDrawing;
  boardColorHex: string;
  animate?: boolean;
  className?: string;
};

/**
 * Renders a saved chalk drawing. When `animate` is true, strokes draw
 * themselves on in sequence (using stroke-dasharray reveal), mimicking
 * the feeling of watching someone write the message live.
 */
export function BoardPlayback({
  drawing,
  boardColorHex,
  animate = false,
  className,
}: BoardPlaybackProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    if (!animate) return;

    let cancelled = false;

    // Measure each path's length, set up the dash trick, then play in sequence.
    const lengths = pathRefs.current.map((el) => el?.getTotalLength() ?? 0);

    pathRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.strokeDasharray = `${lengths[i]}`;
      el.style.strokeDashoffset = `${lengths[i]}`;
    });

    // Reveal the board now that strokes are primed invisible — avoids a flash
    // of the fully-drawn board before the dash-offset trick kicks in.
    if (svgRef.current) svgRef.current.style.opacity = "1";

    let cumulativeDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    drawing.strokes.forEach((_, i) => {
      const duration = Math.min(800, Math.max(180, lengths[i] * 2.2));
      const el = pathRefs.current[i];
      const timeout = setTimeout(() => {
        if (cancelled || !el) return;
        el.style.transition = `stroke-dashoffset ${duration}ms ease-out`;
        el.style.strokeDashoffset = "0";
      }, cumulativeDelay);
      timeouts.push(timeout);
      cumulativeDelay += duration * 0.55; // slight overlap between strokes feels more natural
    });

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [animate, drawing]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`}
      className={className}
      style={{ opacity: animate ? 0 : 1 }}
    >
      <rect width="100%" height="100%" fill={boardColorHex} opacity={0} />
      {drawing.strokes.map((stroke, i) => (
        <path
          key={i}
          ref={(el) => {
            pathRefs.current[i] = el;
          }}
          d={stroke.d}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={stroke.opacity}
        />
      ))}
    </svg>
  );
}
