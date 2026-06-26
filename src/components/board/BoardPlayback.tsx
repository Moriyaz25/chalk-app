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
      <defs>
        <pattern id="playback-card-grain" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M0 8 H44 M0 26 H44 M9 0 V44 M31 0 V44" stroke="#ffffff" strokeOpacity="0.035" />
          <circle cx="11" cy="12" r="1.2" fill="#ffffff" opacity="0.045" />
          <circle cx="34" cy="29" r="1" fill="#000000" opacity="0.06" />
        </pattern>
        <filter id="playback-chalk-dust">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="2" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="0.65" />
        </filter>
        <filter id="playback-soft-paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill={boardColorHex} opacity={0} />
      <rect width="100%" height="100%" fill="url(#playback-card-grain)" opacity={1} />
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
          filter="url(#playback-chalk-dust)"
        />
      ))}
      {drawing.textElements?.map((item) => {
        const estimatedWidth = Math.max(80, item.text.length * item.fontSize * 0.52);
        const estimatedHeight = item.fontSize * 1.35;

        return (
          <g key={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}>
            {item.backgroundColor !== "transparent" && (
              <rect
                x={-estimatedWidth / 2 - 14}
                y={-estimatedHeight + 4}
                width={estimatedWidth + 28}
                height={estimatedHeight + 12}
                rx={10}
                fill={item.backgroundColor}
                opacity={0.88}
                filter="url(#playback-soft-paper-shadow)"
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
              filter="url(#playback-chalk-dust)"
            >
              {item.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
