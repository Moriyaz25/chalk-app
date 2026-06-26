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

export type ChalkTextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  rotation: number;
};

export type ChalkDrawing = {
  /** all strokes in the order they were drawn */
  strokes: ChalkStroke[];
  /** editable text stickers layered above hand-drawn strokes */
  textElements?: ChalkTextElement[];
  /** viewBox the strokes were authored in, so playback can scale correctly */
  viewBox: { width: number; height: number };
};

export const BOARD_VIEWBOX = { width: 600, height: 600 };

export const BOARD_COLORS = {
  "chalkboard-green": "#1c2620",
  "chalkboard-teal": "#16323a",
  "chalkboard-charcoal": "#23241f",
  "chalkboard-forest": "#1d3324",
  "midnight-blue": "#14213d",
  "deep-plum": "#2b1836",
  "warm-paper": "#f4ead7",
  "rose-paper": "#f7d9d4",
  "sky-paper": "#d9eef6",
  "mint-paper": "#dff1df",
  "linen-card": "#f7f1e6",
  "kraft-card": "#c9a66b",
} as const;

export type BoardColorKey = keyof typeof BOARD_COLORS;

export const CHALK_COLORS = [
  { key: "white", hex: "#f4f1e8" },
  { key: "amber", hex: "#e8b86d" },
  { key: "pink", hex: "#e89b95" },
  { key: "sky", hex: "#8fc1d4" },
  { key: "mint", hex: "#9ccba0" },
  { key: "coral", hex: "#ff7a6e" },
  { key: "lavender", hex: "#c7a6ff" },
  { key: "lemon", hex: "#f7e36d" },
  { key: "ink", hex: "#20201d" },
] as const;

export const CARD_FONTS = [
  { label: "Hand Chalk", value: "var(--font-caveat)" },
  { label: "Casual", value: "Comic Sans MS, Bradley Hand, cursive" },
  { label: "Marker", value: "Trebuchet MS, Comic Sans MS, cursive" },
  { label: "Script", value: "Brush Script MT, Segoe Script, cursive" },
  { label: "Note", value: "Segoe Print, Bradley Hand, cursive" },
  { label: "Classic", value: "Georgia, serif" },
  { label: "Editorial", value: "Garamond, Georgia, serif" },
  { label: "Clean", value: "Inter, Segoe UI, sans-serif" },
  { label: "Rounded", value: "Arial Rounded MT Bold, Trebuchet MS, sans-serif" },
  { label: "Typewriter", value: "Courier New, monospace" },
  { label: "Poster", value: "Impact, Arial Black, sans-serif" },
  { label: "Tiny Note", value: "Verdana, Geneva, sans-serif" },
] as const;
