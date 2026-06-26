// Shape of the `drawing` JSON column on Board.
// Stored as SVG-path-like stroke data — vector, so it stays crisp at any
// screen size and is cheap to store/transmit compared to PNG blobs.

export type ChalkStroke = {
  /** SVG path "d" attribute, built from pointer move events */
  d: string;
  /** hex color of the chalk used for this stroke */
  color: string;
  /** stroke width in board-space units (board is normalized to a fixed viewBox) */
  width: number;
  /** 0-1 opacity, lets us fake chalk texture (slightly translucent, layered strokes) */
  opacity: number;
};

export type ChalkDrawing = {
  /** all strokes in the order they were drawn */
  strokes: ChalkStroke[];
  /** viewBox the strokes were authored in, so playback can scale correctly */
  viewBox: { width: number; height: number };
};

export const BOARD_VIEWBOX = { width: 600, height: 600 };

export const BOARD_COLORS = {
  "chalkboard-green": "#1c2620",
  "chalkboard-teal": "#16323a",
  "chalkboard-charcoal": "#23241f",
  "chalkboard-forest": "#1d3324",
} as const;

export type BoardColorKey = keyof typeof BOARD_COLORS;

export const CHALK_COLORS = [
  { key: "white", hex: "#f4f1e8" },
  { key: "amber", hex: "#e8b86d" },
  { key: "pink", hex: "#e89b95" },
  { key: "sky", hex: "#8fc1d4" },
  { key: "mint", hex: "#9ccba0" },
] as const;
